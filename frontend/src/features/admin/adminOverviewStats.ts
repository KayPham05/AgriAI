import type { AdminDailyActivity, AdminImage, AdminSession, AdminUser } from './adminTypes';
import { adminDateBounds, type AdminDateFilter } from './adminDateFilter';

interface OverviewSources {
  users: readonly Pick<AdminUser, 'createdAt' | 'isLocked' | 'warningCount'>[];
  images: readonly Pick<AdminImage, 'uploadedAt'>[];
  sessions: readonly Pick<AdminSession, 'createdAt' | 'expiresAt' | 'endedAt' | 'status'>[];
}

const VIETNAM_OFFSET = 7 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 7;

export function buildAdminOverviewStats(
  data: OverviewSources,
  now: Date,
  filter?: AdminDateFilter | null,
) {
  const timestamp = now.getTime();
  const todayStart = Math.floor((timestamp + VIETNAM_OFFSET) / DAY) * DAY - VIETNAM_OFFSET;
  function countBeforeNow(values: readonly string[], start: number, end: number) {
    return values.filter((value) => {
      const time = Date.parse(value);
      return time >= start && time < end && time <= timestamp;
    }).length;
  }
  const userDates = data.users.map((user) => user.createdAt);
  const imageDates = data.images.map((image) => image.uploadedAt);
  const sessionDates = data.sessions.map((session) => session.createdAt);
  const bounds = filter ? adminDateBounds(filter) : null;
  const monthly = filter?.mode === 'year';
  const count = bounds
    ? monthly
      ? 12
      : Math.round((bounds.end - bounds.start) / DAY)
    : RECENT_DAYS;
  const days: AdminDailyActivity[] = Array.from({ length: count }, (_, index) => {
    const start = bounds
      ? monthly
        ? Date.UTC(Number(filter?.value), index, 1) - VIETNAM_OFFSET
        : bounds.start + index * DAY
      : todayStart - (RECENT_DAYS - index - 1) * DAY;
    const end = monthly
      ? Date.UTC(Number(filter?.value), index + 1, 1) - VIETNAM_OFFSET
      : start + DAY;
    return {
      date: new Date(start + VIETNAM_OFFSET).toISOString().slice(0, 10),
      userCount: countBeforeNow(userDates, start, end),
      imageCount: countBeforeNow(imageDates, start, end),
      sessionCount: countBeforeNow(sessionDates, start, end),
    };
  });
  const total = (values: readonly string[]) =>
    bounds ? countBeforeNow(values, bounds.start, bounds.end) : values.length;
  return {
    totals: {
      userCount: total(userDates),
      imageCount: total(imageDates),
      sessionCount: total(sessionDates),
    },
    today: {
      userCount: countBeforeNow(userDates, todayStart, todayStart + DAY),
      imageCount: countBeforeNow(imageDates, todayStart, todayStart + DAY),
      sessionCount: countBeforeNow(sessionDates, todayStart, todayStart + DAY),
    },
    days,
    activeSessionCount: data.sessions.filter(
      (session) =>
        session.status === 'Active' &&
        !session.endedAt &&
        Date.parse(session.createdAt) <= timestamp &&
        Date.parse(session.expiresAt) > timestamp,
    ).length,
    lockedUserCount: data.users.filter((user) => user.isLocked).length,
    warningCount: data.users.reduce((sum, user) => sum + user.warningCount, 0),
  };
}

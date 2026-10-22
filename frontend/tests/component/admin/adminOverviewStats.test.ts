import { describe, expect, it } from 'vitest';
import { buildAdminOverviewStats } from '@/features/admin/adminOverviewStats';

const now = new Date('2026-10-21T05:00:00Z');
const data = {
  users: [
    { createdAt: '2026-10-20T16:59:59Z', isLocked: true, warningCount: 2 },
    { createdAt: '2026-10-20T17:00:00Z', isLocked: false, warningCount: 1 },
    { createdAt: '2026-10-21T16:59:59Z', isLocked: false, warningCount: 0 },
    { createdAt: '2026-10-21T17:00:00Z', isLocked: false, warningCount: 0 },
    { createdAt: 'invalid', isLocked: false, warningCount: 0 },
  ],
  images: [{ uploadedAt: '2026-10-21T00:00:00Z' }],
  sessions: [
    {
      createdAt: '2026-10-21T00:00:00Z',
      expiresAt: '2026-10-22T00:00:00Z',
      endedAt: null,
      status: 'Active' as const,
    },
    {
      createdAt: '2026-10-21T00:00:00Z',
      expiresAt: now.toISOString(),
      endedAt: null,
      status: 'Active' as const,
    },
    {
      createdAt: '2026-10-20T16:00:00Z',
      expiresAt: '2026-10-22T00:00:00Z',
      endedAt: now.toISOString(),
      status: 'Ended' as const,
    },
    {
      createdAt: '2026-10-21T00:00:00Z',
      expiresAt: 'invalid',
      endedAt: null,
      status: 'Active' as const,
    },
  ],
};

describe('admin overview statistics', () => {
  it('filters a selected Vietnam day without including midnight of the next day', () => {
    const result = buildAdminOverviewStats(data, now, { mode: 'day', value: '2026-10-20' });
    expect(result.totals).toEqual({ userCount: 1, imageCount: 0, sessionCount: 1 });
    expect(result.days).toEqual([
      { date: '2026-10-20', userCount: 1, imageCount: 0, sessionCount: 1 },
    ]);
    expect(result.activeSessionCount).toBe(1);
    expect(result.warningCount).toBe(3);
  });

  it('filters a month and year, aggregates the year by month and excludes future or invalid records', () => {
    const source = {
      ...data,
      images: [
        { uploadedAt: '2025-12-31T16:59:59Z' },
        { uploadedAt: '2025-12-31T17:00:00Z' },
        { uploadedAt: '2026-09-30T16:59:59Z' },
        { uploadedAt: '2026-09-30T17:00:00Z' },
        { uploadedAt: '2026-10-22T00:00:00Z' },
        { uploadedAt: 'invalid' },
      ],
    };
    const month = buildAdminOverviewStats(source, now, { mode: 'month', value: '2026-10' });
    expect(month.totals.imageCount).toBe(1);
    expect(month.days).toHaveLength(31);
    expect(month.days[0].imageCount).toBe(1);
    expect(month.days.at(-1)?.imageCount).toBe(0);
    const year = buildAdminOverviewStats(source, now, { mode: 'year', value: '2026' });
    expect(year.totals.imageCount).toBe(3);
    expect(year.days).toHaveLength(12);
    expect(year.days[0].imageCount).toBe(1);
    expect(year.days[8].imageCount).toBe(1);
    expect(year.days[9].imageCount).toBe(1);
    expect(
      buildAdminOverviewStats(source, now, { mode: 'month', value: '2024-02' }).days,
    ).toHaveLength(29);
  });
  it('counts today using Vietnam midnight and excludes future or invalid timestamps', () => {
    const result = buildAdminOverviewStats(data, now);
    expect(result.totals).toEqual({ userCount: 5, imageCount: 1, sessionCount: 4 });
    expect(result.today).toEqual({ userCount: 1, imageCount: 1, sessionCount: 3 });
    expect(result.activeSessionCount).toBe(1);
    expect(result.lockedUserCount).toBe(1);
    expect(result.warningCount).toBe(3);
    expect(result.days).toHaveLength(7);
    expect(result.days[0].date).toBe('2026-10-15');
    expect(result.days.at(-1)).toEqual({
      date: '2026-10-21',
      userCount: 1,
      imageCount: 1,
      sessionCount: 3,
    });
  });

  it('keeps only seven recent days while retaining older records in all-time totals', () => {
    const older = {
      users: [{ createdAt: '2026-10-01T00:00:00Z', isLocked: false, warningCount: 0 }],
      images: [],
      sessions: [],
    };
    const week = buildAdminOverviewStats(older, now);
    expect(week.days.every((day) => day.userCount === 0)).toBe(true);
    expect(week.days).toHaveLength(7);
    expect(week.totals).toEqual({ userCount: 1, imageCount: 0, sessionCount: 0 });
  });

  it('returns zeroes for empty collections and excludes ended, expired and future sessions', () => {
    const empty = buildAdminOverviewStats({ users: [], images: [], sessions: [] }, now);
    expect(empty.today).toEqual({ userCount: 0, imageCount: 0, sessionCount: 0 });
    expect(empty.activeSessionCount).toBe(0);
    expect(empty.warningCount).toBe(0);
    const result = buildAdminOverviewStats(
      {
        users: [],
        images: [],
        sessions: [
          { ...data.sessions[0], endedAt: now.toISOString() },
          { ...data.sessions[0], status: 'Expired' },
          { ...data.sessions[0], createdAt: '2026-10-22T00:00:00Z' },
        ],
      },
      now,
    );
    expect(result.activeSessionCount).toBe(0);
  });
});

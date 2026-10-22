export interface AdminDateFilter {
  mode: 'day' | 'month' | 'year';
  value: string;
}

const VIETNAM_OFFSET = 7 * 60 * 60 * 1000;

export function adminDateBounds(filter: AdminDateFilter) {
  const [year, month = 1, day = 1] = filter.value.split('-').map(Number);
  const start = Date.UTC(year, month - 1, day) - VIETNAM_OFFSET;
  const end =
    Date.UTC(
      year + (filter.mode === 'year' ? 1 : 0),
      month - 1 + (filter.mode === 'month' ? 1 : 0),
      day + (filter.mode === 'day' ? 1 : 0),
    ) - VIETNAM_OFFSET;
  return { start, end };
}

export function matchesAdminDate(value: string, filter: AdminDateFilter, now: Date) {
  const { start, end } = adminDateBounds(filter);
  const timestamp = Date.parse(value);
  return timestamp >= start && timestamp < end && timestamp <= now.getTime();
}

export function adminDateLabel(filter: AdminDateFilter) {
  return filter.value.split('-').reverse().join('/');
}

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AdminMetricChart } from '@/features/admin/AdminMetricChart';

const SAMPLE_DAYS = [
  { date: '2026-10-15', userCount: 2, imageCount: 0, sessionCount: 1 },
  { date: '2026-10-16', userCount: 0, imageCount: 1, sessionCount: 0 },
  { date: '2026-10-17', userCount: 1, imageCount: 0, sessionCount: 0 },
  { date: '2026-10-18', userCount: 3, imageCount: 2, sessionCount: 1 },
  { date: '2026-10-19', userCount: 0, imageCount: 0, sessionCount: 0 },
  { date: '2026-10-20', userCount: 1, imageCount: 0, sessionCount: 2 },
  { date: '2026-10-21', userCount: 1, imageCount: 1, sessionCount: 1 },
];

describe('AdminMetricChart', () => {
  it('shows a date label for every column', () => {
    render(<AdminMetricChart days={SAMPLE_DAYS} field="userCount" title="Tài khoản mới" />);
    const chartBars = document.querySelector<HTMLElement>('.admin-chart-bars');
    if (!chartBars) throw new Error('Expected chart bars to be rendered');
    const timeElements = within(chartBars).getAllByText(/^\d{2}\/\d{2}$/);
    expect(timeElements).toHaveLength(SAMPLE_DAYS.length);
  });

  it('keeps a single date label in the same column as its bar', () => {
    render(
      <AdminMetricChart
        days={[{ date: '2026-10-21', userCount: 1, imageCount: 0, sessionCount: 0 }]}
        field="userCount"
        title="Tài khoản mới"
      />,
    );
    const column = screen.getByTitle('21/10: 1');
    expect(column.querySelector('.admin-chart-bar')).not.toBeNull();
    expect(column.querySelector('time[datetime="2026-10-21"]')).toHaveTextContent('21/10');
    expect(column.closest('ol')).toHaveStyle({ '--admin-chart-columns': '1' });
  });

  it('shows value count above bars with non-zero values', () => {
    render(<AdminMetricChart days={SAMPLE_DAYS} field="userCount" title="Tài khoản mới" />);
    const valueElements = document.querySelectorAll('[data-chart-value]');
    const nonZeroDays = SAMPLE_DAYS.filter((day) => day.userCount > 0);
    expect(valueElements).toHaveLength(nonZeroDays.length);
    const values = Array.from(valueElements).map((el) => el.textContent);
    expect(values).toEqual(nonZeroDays.map((day) => String(day.userCount)));
  });

  it('does not show value labels for zero-value columns', () => {
    render(<AdminMetricChart days={SAMPLE_DAYS} field="imageCount" title="Ảnh tải lên" />);
    const valueElements = document.querySelectorAll('[data-chart-value]');
    const nonZeroDays = SAMPLE_DAYS.filter((day) => day.imageCount > 0);
    expect(valueElements).toHaveLength(nonZeroDays.length);
  });

  it('shows "Không có phát sinh" when all values are zero', () => {
    const zeroDays = SAMPLE_DAYS.map((day) => ({
      ...day,
      sessionCount: 0,
    }));
    render(<AdminMetricChart days={zeroDays} field="sessionCount" title="Lượt đăng nhập" />);
    expect(screen.getByText('Không có phát sinh')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-chart-value]')).toHaveLength(0);
  });

  it('provides accessible table via details disclosure', async () => {
    const user = userEvent.setup();
    render(<AdminMetricChart days={SAMPLE_DAYS} field="userCount" title="Tài khoản mới" />);
    const summary = screen.getByText('Xem số liệu theo ngày');
    await user.click(summary);
    const table = screen.getByRole('table', { name: 'Tài khoản mới theo ngày' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(SAMPLE_DAYS.length + 1);
  });

  it('uses monthly ticks in their own columns and retains full dates in the accessible table', () => {
    const days = Array.from({ length: 12 }, (_, index) => ({
      date: `2026-${String(index + 1).padStart(2, '0')}-01`,
      userCount: index,
      imageCount: 0,
      sessionCount: 0,
    }));
    render(
      <AdminMetricChart days={days} field="userCount" title="Tài khoản mới" granularity="month" />,
    );
    const first = screen.getByTitle('01/2026: 0');
    const last = screen.getByTitle('12/2026: 11');
    expect(first.querySelector('time')).toHaveTextContent('T1');
    expect(last.querySelector('time')).toHaveTextContent('T12');
    expect(
      within(screen.getByRole('table', { name: 'Tài khoản mới theo tháng' })).getAllByRole('row'),
    ).toHaveLength(13);
  });

  it('shows all 12 month labels for yearly granularity', () => {
    const days = Array.from({ length: 12 }, (_, index) => ({
      date: `2026-${String(index + 1).padStart(2, '0')}-01`,
      userCount: index,
      imageCount: 0,
      sessionCount: 0,
    }));
    render(
      <AdminMetricChart days={days} field="userCount" title="Tài khoản mới" granularity="month" />,
    );
    const timeElements = screen.getAllByText(/^T\d{1,2}$/);
    expect(timeElements).toHaveLength(12);
  });

  it('renders correct title attributes with date and value', () => {
    render(
      <AdminMetricChart days={SAMPLE_DAYS.slice(0, 2)} field="userCount" title="Tài khoản mới" />,
    );
    expect(screen.getByTitle('15/10: 2')).toBeInTheDocument();
    expect(screen.getByTitle('16/10: 0')).toBeInTheDocument();
  });
});

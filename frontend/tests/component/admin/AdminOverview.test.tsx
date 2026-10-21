import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminMockProvider } from '@/features/admin/AdminMockProvider';
import { AdminOverview } from '@/features/admin/AdminOverview';

afterEach(() => vi.useRealTimers());

describe('actionable admin overview', () => {
  it('filters metrics, charts and recent images by day, month and year and clears the selection', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
    render(
      <AdminMockProvider>
        <AdminOverview onImages={vi.fn()} onUsers={vi.fn()} onSessions={vi.fn()} />
      </AdminMockProvider>,
    );
    await userEvent.click(screen.getByText('Lịch tháng', { selector: 'summary' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ngày 20/10/2026' }));
    expect(screen.getByRole('status', { name: 'Bộ lọc thời gian' })).toHaveTextContent(
      '20/10/2026',
    );
    expect(
      within(screen.getByRole('region', { name: 'Ảnh gần đây' })).getByText('Trần Thị Bình'),
    ).toBeVisible();
    expect(
      within(screen.getByRole('region', { name: 'Ảnh gần đây' })).queryByText('Nguyễn Văn An'),
    ).toBeNull();
    for (const table of screen.getAllByRole('table', { name: /theo ngày/ }))
      expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Theo ngày' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Theo tháng' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Theo năm' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Chọn tháng' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tháng 9/2026' }));
    expect(screen.getByRole('status', { name: 'Bộ lọc thời gian' })).toHaveTextContent('09/2026');
    expect(
      within(screen.getByRole('region', { name: 'Ảnh gần đây' })).getByText(
        'Không có ảnh trong thời gian đã chọn.',
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole('region', { name: 'Người dùng' })).getByText('0', {
        selector: 'p.text-3xl',
      }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Chọn năm' }));
    await userEvent.click(screen.getByRole('button', { name: 'Năm 2026' }));
    expect(screen.getAllByRole('table', { name: /theo tháng/ })).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'Làm mới số liệu minh họa' }));
    expect(screen.getByRole('status', { name: 'Bộ lọc thời gian' })).toHaveTextContent('2026');
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ lọc thời gian' }));
    expect(screen.getByRole('status', { name: 'Bộ lọc thời gian' })).toHaveTextContent('Toàn bộ');
    for (const table of screen.getAllByRole('table', { name: /theo ngày/ }))
      expect(within(table).getAllByRole('row')).toHaveLength(8);
    expect(
      within(screen.getByRole('region', { name: 'Ảnh gần đây' })).getByText('Nguyễn Văn An'),
    ).toBeVisible();
  });
  it('shows today and attention with fixed seven-day charts and no period selector', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
    const onUsers = vi.fn();
    const onSessions = vi.fn();
    render(
      <AdminMockProvider>
        <AdminOverview onImages={vi.fn()} onUsers={onUsers} onSessions={onSessions} />
      </AdminMockProvider>,
    );
    expect(
      within(screen.getByRole('region', { name: 'Người dùng' })).getByText('1 mới hôm nay'),
    ).toBeVisible();
    expect(
      within(screen.getByRole('region', { name: 'Ảnh đã tải lên' })).getByText('1 tải lên hôm nay'),
    ).toBeVisible();
    const sessions = within(screen.getByRole('region', { name: 'Phiên đăng nhập' }));
    expect(sessions.getByText('1 lượt hôm nay')).toBeVisible();
    expect(sessions.getByText('1 còn hiệu lực')).toBeVisible();
    const attention = within(screen.getByRole('region', { name: 'Cần chú ý' }));
    expect(attention.getByText('Chưa ghi nhận tài khoản bị khóa hoặc cảnh báo.')).toBeVisible();
    await userEvent.click(attention.getByRole('button', { name: 'Xem tài khoản' }));
    expect(onUsers).toHaveBeenCalledOnce();
    await userEvent.click(attention.getByRole('button', { name: 'Xem phiên' }));
    expect(onSessions).toHaveBeenCalledOnce();
    expect(screen.queryByRole('group', { name: 'Khoảng thời gian thống kê' })).toBeNull();
    expect(screen.queryByRole('button', { name: '7 ngày' })).toBeNull();
    expect(screen.queryByRole('button', { name: '30 ngày' })).toBeNull();
    for (const table of screen.getAllByRole('table', { name: /theo ngày/ }))
      expect(within(table).getAllByRole('row')).toHaveLength(8);
    vi.setSystemTime(new Date('2026-10-22T05:00:00Z'));
    await userEvent.click(screen.getByRole('button', { name: 'Làm mới số liệu minh họa' }));
    expect(sessions.getByText('0 lượt hôm nay')).toBeVisible();
    expect(sessions.getByText('0 còn hiệu lực')).toBeVisible();
    expect(screen.getByRole('status', { name: 'Cập nhật số liệu' })).toHaveTextContent(
      'Đã cập nhật từ dữ liệu minh họa hiện có.',
    );
  });
});

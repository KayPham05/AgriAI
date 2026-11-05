import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminCrmPage } from '@/features/admin/AdminCrmPage';
import { saveAuthSession, clearAuthSession } from '@/services/authApi';
import { json } from '../../helpers/knowledge';
import { AdminRecordList } from '@/features/admin/AdminRecordList';
import { AdminUsers } from '@/features/admin/AdminUsers';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
afterEach(() => {
  clearAuthSession();
  vi.useRealTimers();
});

it('loads real users ten per page and persists moderation through authenticated API calls', async () => {
  const admin = {
    id: 'admin',
    fullName: 'Administrator',
    email: 'admin@test.local',
    role: 'Admin',
    createdAt: '',
  };
  saveAuthSession({ token: 'token', user: admin }, true);
  let active = true;
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith('/api/auth/me')) return json(admin);
    if (url.endsWith('/status')) {
      active = false;
      return json({});
    }
    return json({
      items: [
        {
          id: 'real-user',
          fullName: 'Database user',
          email: 'db@test.local',
          role: 'User',
          isActive: active,
          createdAt: '2026-11-01T00:00:00Z',
          predictionCount: 2,
        },
      ],
      pageNumber: 1,
      pageSize: 10,
      totalCount: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
  vi.stubGlobal('fetch', fetch);
  render(<AdminCrmPage />);
  await screen.findByRole('heading', { name: 'Tổng quan vận hành' });
  await userEvent.click(screen.getByRole('button', { name: 'Người dùng' }));
  const row = (await screen.findByText('Database user')).closest('li') as HTMLElement;
  expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument();
  await userEvent.click(within(row).getByRole('button', { name: 'Khóa tài khoản' }));
  const dialog = within(screen.getByRole('dialog'));
  await userEvent.type(dialog.getByLabelText('Lý do'), 'Fixture reason');
  await userEvent.click(dialog.getByRole('button', { name: 'Xác nhận khóa' }));
  await waitFor(() => expect(screen.getByText('Đã khóa')).toBeVisible());
  expect(fetch).toHaveBeenCalledWith(
    '/api/admin/users/real-user/status',
    expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      body: JSON.stringify({ isActive: false, reason: 'Fixture reason' }),
    }),
  );
  expect(fetch.mock.calls.some(([url]) => url.includes('pageSize=10'))).toBe(true);
});

it('requests the next server page and debounces search, resetting to page one', async () => {
  const fetch = vi.fn(async (url: string) => {
    const params = new URL(url, 'http://localhost').searchParams;
    const page = Number(params.get('pageNumber'));
    return json({
      items: [{ id: `row-${page}`, fullName: `Server page ${page}` }],
      pageNumber: page,
      pageSize: 10,
      totalCount: 12,
      totalPages: 2,
    });
  });
  vi.stubGlobal('fetch', fetch);
  render(
    <AdminRecordList<{ id: string; fullName: string }>
      resource="users"
      token="token"
      title="Users"
      empty="Empty"
    >
      {(item) => <span>{item.fullName}</span>}
    </AdminRecordList>,
  );
  expect(await screen.findByText('Server page 1')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
  expect(await screen.findByText('Server page 2')).toBeVisible();
  vi.useFakeTimers();
  const search = screen.getByLabelText('Tìm theo tên hoặc email người dùng');
  fireEvent.change(search, { target: { value: 'A' } });
  fireEvent.change(search, { target: { value: 'An' } });
  await act(async () => vi.advanceTimersByTime(499));
  expect(fetch).toHaveBeenCalledTimes(2);
  await act(async () => vi.advanceTimersByTime(1));
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(fetch.mock.calls[2][0]).toContain('pageNumber=1&pageSize=10&search=An');
});

it('shows query errors with retry and retains the moderation dialog on a failed write', async () => {
  let failRead = true;
  const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return json({ message: 'Warning could not be saved' }, 500);
    if (failRead) return json({}, 403);
    return json({
      items: [
        {
          id: 'user',
          fullName: 'Actual user',
          role: 'User',
          isActive: true,
          createdAt: '2026-11-01',
          predictionCount: 0,
        },
      ],
      totalCount: 1,
      totalPages: 1,
    });
  });
  vi.stubGlobal('fetch', fetch);
  render(<AdminUsers token="token" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('không có quyền');
  failRead = false;
  await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText('Actual user')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Gửi cảnh báo' }));
  const dialog = within(screen.getByRole('dialog'));
  await userEvent.type(dialog.getByLabelText('Nội dung cảnh báo'), 'Real warning');
  await userEvent.click(dialog.getByRole('button', { name: 'Gửi cảnh báo' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Warning could not be saved');
  expect(dialog.getByLabelText('Nội dung cảnh báo')).toHaveValue('Real warning');
  expect(screen.queryByText('Đã cập nhật tài khoản trên hệ thống.')).not.toBeInTheDocument();
});

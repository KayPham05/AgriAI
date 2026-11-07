import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import { json } from '../../helpers/knowledge';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAuthSession, saveAuthSession } from '@/services/authApi';
import { AdminCrmPage } from '@/features/admin/AdminCrmPage';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

afterEach(clearAuthSession);

async function setup() {
  const admin = {
    id: 'admin',
    fullName: 'Admin',
    email: 'admin@example.test',
    role: 'Admin',
    createdAt: '2026-10-01T00:00:00Z',
  };
  saveAuthSession({ token: 'admin-token', user: admin }, true);
  let isActive = true;
  let ended = false;
  let lockReason: string | null = null;
  const requests = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/auth/me') return { ok: true, json: async () => admin };
    if (url.endsWith('/status')) {
      const change = JSON.parse(String(init?.body));
      isActive = change.isActive;
      lockReason = change.reason;
      if (!isActive) ended = true;
      return json({});
    }
    if (url.endsWith('/logout-all')) {
      ended = true;
      return new Response(null, { status: 204 });
    }
    if (url.endsWith('/warnings')) return new Response(null, { status: 204 });
    if (url.endsWith('/content')) return new Response(new Blob(['image'], { type: 'image/jpeg' }));
    const identity = { userId: 'user', userName: 'Nguyễn Văn An', userEmail: 'an@example.test' };
    const items = url.includes('/api/admin/users?')
      ? [
          {
            ...admin,
            id: 'user',
            fullName: identity.userName,
            email: identity.userEmail,
            role: 'User',
            isActive,
            lockReason,
            predictionCount: 1,
          },
        ]
      : url.includes('/api/admin/images?')
        ? [
            {
              ...identity,
              id: 'image',
              status: 'Available',
              uploadedAt: admin.createdAt,
              expiresAt: '2027-01-01',
            },
          ]
        : url.includes('/api/admin/sessions?')
          ? [
              {
                ...identity,
                id: 'session',
                status: ended ? 'Ended' : 'Active',
                createdAt: admin.createdAt,
                expiresAt: '2027-01-01',
                endedAt: ended ? admin.createdAt : null,
              },
            ]
          : null;
    if (items) return json({ items, totalPages: 1, totalCount: 1, pageNumber: 1, pageSize: 10 });
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal('fetch', requests);
  const user = userEvent.setup();
  render(<AdminCrmPage />);
  await screen.findByRole('heading', { name: 'Tổng quan vận hành' });
  return { user, requests };
}

function accountRow(name = 'Nguyễn Văn An') {
  const region = screen.getByRole('region', { name: 'Danh sách người dùng' });
  return within(within(region).getByText(name).closest('li') as HTMLElement);
}

async function confirm(label: string) {
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: label }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}

describe('Admin frontend integration through authenticated HTTP requests', () => {
  it('locks and restores an account while its ended session stays ended across navigation', async () => {
    const { user, requests } = await setup();
    await user.click(screen.getByRole('button', { name: 'Người dùng' }));
    await screen.findByText('Nguyễn Văn An');
    await user.click(accountRow().getByRole('button', { name: 'Khóa tài khoản' }));
    await user.type(screen.getByLabelText('Lý do'), 'Vi phạm nội dung');
    await confirm('Xác nhận khóa');
    expect(await screen.findByText('Đã khóa')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Phiên đăng nhập' }));
    const sessions = screen.getByRole('region', { name: 'Danh sách phiên đăng nhập' });
    const row = (await within(sessions).findByText('Nguyễn Văn An')).closest('li') as HTMLElement;
    expect(within(row).getByText('Đã đăng xuất')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Người dùng' }));
    await screen.findByText('Nguyễn Văn An');
    await user.click(accountRow().getByRole('button', { name: 'Khôi phục tài khoản' }));
    await confirm('Xác nhận khôi phục');
    expect(await screen.findByText('Hoạt động')).toBeVisible();
    expect(accountRow().queryByText(/Lý do khóa/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Phiên đăng nhập' }));
    const restoredRow = (await screen.findByText('Nguyễn Văn An')).closest('li') as HTMLElement;
    expect(within(restoredRow).getByText('Đã đăng xuất')).toBeVisible();
    expect(requests.mock.calls.filter(([url]) => url.endsWith('/status'))).toHaveLength(2);
  });

  it('sends image and account warnings to the correct endpoints across tabs', async () => {
    const { user, requests } = await setup();
    await user.click(screen.getByRole('button', { name: 'Ảnh đã tải lên' }));
    const imageRow = (await screen.findByText('Nguyễn Văn An')).closest('li') as HTMLElement;
    await user.click(within(imageRow).getByRole('button', { name: 'Cảnh báo ảnh vi phạm' }));
    await user.type(screen.getByLabelText('Nội dung cảnh báo'), 'Ảnh minh họa');
    await confirm('Gửi cảnh báo');
    expect(await screen.findByText('Còn lưu trữ')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Người dùng' }));
    await screen.findByText('Nguyễn Văn An');
    await user.click(accountRow().getByRole('button', { name: 'Gửi cảnh báo' }));
    await user.type(screen.getByLabelText('Nội dung cảnh báo'), 'Tài khoản minh họa');
    await confirm('Gửi cảnh báo');
    expect(requests).toHaveBeenCalledWith(
      '/api/admin/images/image/warnings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'Ảnh minh họa' }),
      }),
    );
    expect(requests).toHaveBeenCalledWith(
      '/api/admin/users/user/warnings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'Tài khoản minh họa' }),
      }),
    );
  });

  it('cancels a lock without changing the account or active session', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Người dùng' }));
    await screen.findByText('Nguyễn Văn An');
    await user.click(accountRow().getByRole('button', { name: 'Khóa tài khoản' }));
    await user.type(screen.getByLabelText('Lý do'), 'Không xác nhận');
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(accountRow().getByText('Hoạt động')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Phiên đăng nhập' }));
    const row = (await screen.findByText('Nguyễn Văn An')).closest('li') as HTMLElement;
    expect(within(row).getByText('Còn hiệu lực')).toBeVisible();
  });

  it('requests forced logout without clearing the admin login', async () => {
    const { user, requests } = await setup();
    await user.click(screen.getByRole('button', { name: 'Người dùng' }));
    await screen.findByText('Nguyễn Văn An');
    await user.click(accountRow().getByRole('button', { name: 'Cưỡng chế đăng xuất' }));
    await confirm('Xác nhận đăng xuất');
    expect(await screen.findByText('Hoạt động')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Phiên đăng nhập' }));
    const row = (await screen.findByText('Nguyễn Văn An')).closest('li') as HTMLElement;
    expect(within(row).getByText('Đã đăng xuất')).toBeVisible();
    expect(localStorage.getItem('leafai_auth_session')).toContain('admin-token');
    expect(requests).toHaveBeenCalledWith(
      '/api/admin/users/user/logout-all',
      expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer admin-token' } }),
    );
  });
});

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAuthSession, saveAuthSession } from '@/services/authApi';
import { AdminCrmPage } from './AdminCrmPage';

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
  const requests = vi.fn(async (url: string) => {
    if (url === '/api/auth/me') return { ok: true, json: async () => admin };
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal('fetch', requests);
  const user = userEvent.setup();
  render(<AdminCrmPage />);
  await screen.findByText(/Dữ liệu minh họa/);
  return { user, requests };
}

function accountRow(name = 'Nguyễn Văn An') {
  const region = screen.getByRole('region', { name: 'Danh sách người dùng' });
  return within(within(region).getByText(name).closest('li') as HTMLElement);
}

async function confirm(label: string) {
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: label }));
  expect(screen.queryByRole('dialog')).toBeNull();
}

describe('Admin frontend integration with real mock provider and components', () => {
  it('locks and restores an account while its ended session stays ended across navigation', async () => {
    const { user, requests } = await setup();
    await user.click(screen.getByRole('button', { name: 'Người dùng' }));
    await user.click(accountRow().getByRole('button', { name: 'Khóa tài khoản' }));
    await user.type(screen.getByLabelText('Lý do'), 'Kiểm tra luồng mock');
    await confirm('Xác nhận khóa');
    expect(accountRow().getByText('Đã khóa')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Phiên đăng nhập' }));
    const sessions = screen.getByRole('region', { name: 'Danh sách phiên đăng nhập' });
    const row = within(sessions).getByText('Nguyễn Văn An').closest('li') as HTMLElement;
    expect(within(row).getByText('Đã đăng xuất')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Người dùng' }));
    await user.click(accountRow().getByRole('button', { name: 'Khôi phục tài khoản' }));
    await confirm('Xác nhận khôi phục');
    expect(accountRow().getByText('Hoạt động')).toBeVisible();
    expect(accountRow().queryByText(/Lý do khóa/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Phiên đăng nhập' }));
    const restoredRow = screen.getByText('Nguyễn Văn An').closest('li') as HTMLElement;
    expect(within(restoredRow).getByText('Đã đăng xuất')).toBeVisible();
    expect(requests.mock.calls.map(([url]) => url)).toEqual(['/api/auth/me']);
  });

  it('accumulates image and account warnings on the same owner across tabs', async () => {
    const { user, requests } = await setup();
    await user.click(screen.getByRole('button', { name: 'Ảnh đã tải lên' }));
    const imageRow = screen.getByText('Nguyễn Văn An').closest('li') as HTMLElement;
    await user.click(within(imageRow).getByRole('button', { name: 'Cảnh báo ảnh vi phạm' }));
    await user.type(screen.getByLabelText('Nội dung cảnh báo'), 'Ảnh minh họa');
    await confirm('Gửi cảnh báo');
    expect(within(imageRow).getByText('Còn lưu trữ')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Người dùng' }));
    expect(accountRow().getByText('1 cảnh báo đã gửi')).toBeVisible();
    await user.click(accountRow().getByRole('button', { name: 'Gửi cảnh báo' }));
    await user.type(screen.getByLabelText('Nội dung cảnh báo'), 'Tài khoản minh họa');
    await confirm('Gửi cảnh báo');
    expect(accountRow().getByText('2 cảnh báo đã gửi')).toBeVisible();
    expect(accountRow('Trần Thị Bình').getByText('0 cảnh báo đã gửi')).toBeVisible();
    expect(requests.mock.calls.map(([url]) => url)).toEqual(['/api/auth/me']);
  });

  it('cancels a lock without changing the account or active session', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Người dùng' }));
    await user.click(accountRow().getByRole('button', { name: 'Khóa tài khoản' }));
    await user.type(screen.getByLabelText('Lý do'), 'Không xác nhận');
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(accountRow().getByText('Hoạt động')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Phiên đăng nhập' }));
    const row = screen.getByText('Nguyễn Văn An').closest('li') as HTMLElement;
    expect(within(row).getByText('Còn hiệu lực')).toBeVisible();
  });

  it('simulates forced logout without clearing the actual admin login', async () => {
    const { user, requests } = await setup();
    await user.click(screen.getByRole('button', { name: 'Người dùng' }));
    await user.click(accountRow().getByRole('button', { name: 'Cưỡng chế đăng xuất' }));
    await confirm('Xác nhận đăng xuất');
    expect(accountRow().getByText('Hoạt động')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Phiên đăng nhập' }));
    const row = screen.getByText('Nguyễn Văn An').closest('li') as HTMLElement;
    expect(within(row).getByText('Đã đăng xuất')).toBeVisible();
    expect(localStorage.getItem('leafai_auth_session')).toContain('admin-token');
    expect(requests.mock.calls.map(([url]) => url)).toEqual(['/api/auth/me']);
  });
});

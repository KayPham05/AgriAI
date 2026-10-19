import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveAuthSession, clearAuthSession } from '@/services/authApi';
import { AdminCrmPage } from '@/features/admin/AdminCrmPage';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const admin = {
  id: 'admin-id',
  fullName: 'Administrator',
  email: 'admin@example.test',
  role: 'Admin',
  createdAt: '2026-10-13T00:00:00Z',
};
function setup(role = 'Admin') {
  saveAuthSession({ token: 'admin-token', user: { ...admin, role } }, true);
  const requests = vi.fn(async (url: string) => {
    if (url.endsWith('/api/auth/me'))
      return { ok: true, json: async (): Promise<typeof admin> => ({ ...admin, role }) };
    throw new Error(`Unexpected non-authentication request: ${url}`);
  });
  vi.stubGlobal('fetch', requests);
  return requests;
}
afterEach(() => {
  vi.unstubAllGlobals();
  clearAuthSession();
});

describe('Admin mock workspace with real authentication', () => {
  it('shows mock records and charts without requesting administrative APIs', async () => {
    const requests = setup();
    render(<AdminCrmPage />);
    expect(await screen.findByText(/Dữ liệu minh họa/)).toBeVisible();
    expect(screen.getByRole('region', { name: 'Ảnh gần đây' })).toBeVisible();
    expect(screen.getAllByRole('table', { name: /theo ngày/ })).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'Người dùng' }));
    expect(await screen.findByText('Nguyễn Văn An')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Ảnh đã tải lên' }));
    expect(await screen.findByRole('region', { name: 'Danh sách ảnh đã tải lên' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Phiên đăng nhập' }));
    expect(await screen.findByRole('region', { name: 'Danh sách phiên đăng nhập' })).toBeVisible();
    expect(requests.mock.calls.map(([url]) => url)).toEqual(['/api/auth/me']);
  });
  it('keeps role verification for regular users and missing sessions', async () => {
    setup('User');
    const page = render(<AdminCrmPage />);
    expect(await screen.findByText('Tài khoản này không có quyền Admin.')).toBeVisible();
    expect(screen.queryByText(/Dữ liệu minh họa/)).toBeNull();
    page.unmount();
    clearAuthSession();
    render(<AdminCrmPage />);
    expect(await screen.findByText('Đăng nhập bằng tài khoản Admin để tiếp tục.')).toBeVisible();
  });
  it('filters mock accounts from dashboard search and handles no matches', async () => {
    setup();
    render(<AdminCrmPage />);
    await screen.findByText(/Dữ liệu minh họa/);
    await userEvent.type(
      screen.getByLabelText('Tìm tài khoản theo tên hoặc email'),
      'an@example.test',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tìm tài khoản' }));
    expect(screen.getByText('Nguyễn Văn An')).toBeVisible();
    expect(screen.queryByText('Trần Thị Bình')).toBeNull();
    const search = screen.getByLabelText('Tìm theo tên hoặc email người dùng');
    await userEvent.clear(search);
    await userEvent.type(search, 'nobody@example.test');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    expect(screen.getByText('Không tìm thấy kết quả phù hợp.')).toBeVisible();
  });
  it('locks a mock account only in memory and resets it when the workspace remounts', async () => {
    const requests = setup();
    const page = render(<AdminCrmPage />);
    await screen.findByText(/Dữ liệu minh họa/);
    await userEvent.click(screen.getByRole('button', { name: 'Người dùng' }));
    let row = screen.getByText('Nguyễn Văn An').closest('li') as HTMLElement;
    await userEvent.click(within(row).getByRole('button', { name: 'Khóa tài khoản' }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.type(dialog.getByLabelText('Lý do'), 'Kiểm tra giao diện');
    await userEvent.click(dialog.getByRole('button', { name: 'Xác nhận khóa' }));
    await waitFor(() => expect(within(row).getByText('Đã khóa')).toBeVisible());
    expect(requests.mock.calls.map(([url]) => url)).toEqual(['/api/auth/me']);
    page.unmount();
    render(<AdminCrmPage />);
    await screen.findByText(/Dữ liệu minh họa/);
    await userEvent.click(screen.getByRole('button', { name: 'Người dùng' }));
    row = screen.getByText('Nguyễn Văn An').closest('li') as HTMLElement;
    expect(within(row).getByText('Hoạt động')).toBeVisible();
  });
  it('simulates deleting an image without changing the authenticated session', async () => {
    const requests = setup();
    render(<AdminCrmPage />);
    await screen.findByText(/Dữ liệu minh họa/);
    await userEvent.click(screen.getByRole('button', { name: 'Ảnh đã tải lên' }));
    const row = screen.getByText('Nguyễn Văn An').closest('li') as HTMLElement;
    await userEvent.click(within(row).getByRole('button', { name: 'Xóa ảnh' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận xóa ảnh' }),
    );
    await waitFor(() =>
      expect(within(row).getByRole('button', { name: 'Xóa ảnh' })).toBeDisabled(),
    );
    expect(requests.mock.calls.map(([url]) => url)).toEqual(['/api/auth/me']);
    expect(localStorage.getItem('leafai_auth_session')).not.toBeNull();
  });
  it('preserves hover and keyboard expansion without a header toggle', async () => {
    setup();
    render(<AdminCrmPage />);
    await screen.findByText(/Dữ liệu minh họa/);
    const rail = screen.getByRole('complementary', { name: 'Thanh điều hướng quản trị' });
    const label = screen.getByText('Người dùng', { selector: '.admin-rail-label' });
    expect(label).not.toBeVisible();
    await userEvent.hover(rail);
    expect(label).toBeVisible();
    await userEvent.unhover(rail);
    expect(label).not.toBeVisible();
    within(rail).getByRole('button', { name: 'Người dùng' }).focus();
    await waitFor(() => expect(label).toBeVisible());
    expect(screen.queryByRole('button', { name: 'Mở rộng thanh điều hướng' })).toBeNull();
  });
  it('logs out locally with the original backend and never calls a logout endpoint', async () => {
    const requests = setup();
    render(<AdminCrmPage />);
    await screen.findByText(/Dữ liệu minh họa/);
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(requests.mock.calls.map(([url]) => url)).toEqual(['/api/auth/me']);
    expect(localStorage.getItem('leafai_auth_session')).toBeNull();
    expect(sessionStorage.getItem('leafai_auth_session')).toBeNull();
  });
});

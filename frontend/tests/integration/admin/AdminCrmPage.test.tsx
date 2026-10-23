import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  vi.stubGlobal('innerWidth', 1280);
  saveAuthSession({ token: 'admin-token', user: { ...admin, role } }, true);
  const requests = vi.fn(async (url: string) => {
    if (url.endsWith('/api/auth/logout')) return { ok: true, status: 204 };
    if (url.endsWith('/api/auth/me'))
      return { ok: true, json: async (): Promise<typeof admin> => ({ ...admin, role }) };
    throw new Error(`Unexpected non-authentication request: ${url}`);
  });
  vi.stubGlobal('fetch', requests);
  return requests;
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  clearAuthSession();
});

describe('Admin mock workspace with real authentication', () => {
  it('returns to the overview from the logo without restarting authentication or loading', async () => {
    const requests = setup();
    render(<AdminCrmPage />);
    await screen.findByRole('heading', { name: 'Tổng quan vận hành' });
    await userEvent.click(screen.getByRole('button', { name: 'Người dùng' }));
    expect(screen.getByRole('heading', { name: 'Người dùng' })).toBeVisible();
    const logo = screen.getByRole('link', { name: /AgriAI, về trang/ });
    expect(logo).toHaveAttribute('href', '/admin');
    await userEvent.click(logo);
    expect(screen.getByRole('heading', { name: 'Tổng quan vận hành' })).toBeVisible();
    expect(screen.queryByRole('status', { name: 'Đang kết nối AgriAI' })).toBeNull();
    expect(screen.queryByRole('status', { name: 'Đang tải AgriAI' })).toBeNull();
    expect(localStorage.getItem('leafai_auth_session')).not.toBeNull();
    expect(requests.mock.calls.map(([url]) => url)).toEqual(['/api/auth/me']);
  });
  it('shows mock records and charts without requesting administrative APIs', async () => {
    const requests = setup();
    render(<AdminCrmPage />);
    expect(
      screen
        .getByRole('status', { name: 'Đang tải AgriAI' })
        .querySelectorAll('[data-reload-block]'),
    ).toHaveLength(4);
    expect(await screen.findByRole('heading', { name: 'Tổng quan vận hành' })).toBeVisible();
    expect(screen.queryByRole('note')).toBeNull();
    expect(
      screen
        .getByRole('link', { name: 'AgriAI, về trang tổng quan' })
        .querySelector('img')
        ?.getAttribute('src'),
    ).toContain('agriai-leaf-mark.png');
    expect(screen.getAllByRole('table', { name: /theo ngày/ })).toHaveLength(3);
    expect(screen.getByRole('region', { name: 'Ảnh gần đây' })).toBeVisible();
    await userEvent.click(screen.getByText('Lịch tháng', { selector: 'summary' }));
    expect(screen.getByRole('region', { name: 'Lịch tháng' })).toBeVisible();
    await userEvent.click(screen.getByText('Lịch tháng', { selector: 'summary' }));
    expect(screen.queryByRole('navigation', { name: 'Các mục tổng quan' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Các mục quản trị' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Tài khoản quản trị' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Phiên gần đây' })).toBeNull();
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
    expect(screen.queryByRole('heading', { name: 'Tổng quan vận hành' })).toBeNull();
    page.unmount();
    clearAuthSession();
    render(<AdminCrmPage />);
    expect(await screen.findByText('Đăng nhập bằng tài khoản Admin để tiếp tục.')).toBeVisible();
  });
  it('filters mock accounts from dashboard search and handles no matches', async () => {
    setup();
    render(<AdminCrmPage />);
    await screen.findByRole('heading', { name: 'Tổng quan vận hành' });
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
    await screen.findByRole('heading', { name: 'Tổng quan vận hành' });
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
    await screen.findByRole('heading', { name: 'Tổng quan vận hành' });
    await userEvent.click(screen.getByRole('button', { name: 'Người dùng' }));
    row = screen.getByText('Nguyễn Văn An').closest('li') as HTMLElement;
    expect(within(row).getByText('Hoạt động')).toBeVisible();
  });
  it('simulates deleting an image without changing the authenticated session', async () => {
    const requests = setup();
    render(<AdminCrmPage />);
    await screen.findByRole('heading', { name: 'Tổng quan vận hành' });
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
  it('keeps the sidebar collapsed when hovered, focused or touched', async () => {
    setup();
    render(<AdminCrmPage />);
    await screen.findByRole('heading', { name: 'Tổng quan vận hành' });
    const rail = screen.getByRole('complementary', { name: 'Thanh điều hướng quản trị' });
    const label = screen.getByText('Người dùng', { selector: '.admin-rail-label' });
    expect(label).not.toBeVisible();
    await userEvent.hover(rail);
    expect(label).not.toBeVisible();
    await userEvent.unhover(rail);
    expect(label).not.toBeVisible();
    within(rail).getByRole('button', { name: 'Người dùng' }).focus();
    expect(label).not.toBeVisible();
    await userEvent.pointer([
      { keys: '[TouchA>]', target: rail },
      { keys: '[/TouchA]', target: rail },
    ]);
    expect(label).not.toBeVisible();
    expect(screen.getByRole('button', { name: 'Mở rộng thanh điều hướng' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('pins the sidebar open and collapses it using the header button or keyboard', async () => {
    setup();
    render(<AdminCrmPage />);
    await screen.findByRole('heading', { name: 'Tổng quan vận hành' });
    const rail = screen.getByRole('complementary', { name: 'Thanh điều hướng quản trị' });
    const label = screen.getByText('Người dùng', { selector: '.admin-rail-label' });
    const toggle = screen.getByRole('button', { name: 'Mở rộng thanh điều hướng' });
    expect(toggle).toHaveAttribute('aria-controls', rail.id);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    await userEvent.hover(rail);
    await userEvent.unhover(rail);
    expect(label).toBeVisible();
    within(rail).getByRole('button', { name: 'Người dùng' }).focus();
    toggle.focus();
    expect(label).toBeVisible();
    await userEvent.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(label).not.toBeVisible();
    await userEvent.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(label).toBeVisible();
    await userEvent.click(toggle);
    expect(label).not.toBeVisible();
  });
  it('keeps the admin session when server revocation fails', async () => {
    const requests = setup();
    render(<AdminCrmPage />);
    await screen.findByRole('heading', { name: 'Tổng quan vận hành' });
    requests.mockRejectedValueOnce(new Error('offline'));
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa thể thu hồi phiên');
    expect(localStorage.getItem('leafai_auth_session')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Tổng quan vận hành' })).toBeVisible();
  });

  it('revokes the backend session before clearing local authentication', async () => {
    const requests = setup();
    render(<AdminCrmPage />);
    await screen.findByRole('heading', { name: 'Tổng quan vận hành' });
    vi.useFakeTimers();
    router.replace.mockClear();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' })));
    expect(screen.getByRole('heading', { name: 'Tạm biệt, Administrator.' })).toBeVisible();
    expect(screen.getByText('HẸN GẶP LẠI')).toBeVisible();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Tổng quan vận hành' })).toBeNull();
    act(() => vi.advanceTimersByTime(3999));
    expect(router.replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(router.replace).toHaveBeenCalledExactlyOnceWith('/');
    expect(requests.mock.calls.map(([url]) => url)).toEqual(['/api/auth/me', '/api/auth/logout']);
    expect(localStorage.getItem('leafai_auth_session')).toBeNull();
    expect(sessionStorage.getItem('leafai_auth_session')).toBeNull();
  });
});

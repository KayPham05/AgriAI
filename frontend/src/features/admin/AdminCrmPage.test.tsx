import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveAuthSession, clearAuthSession } from '@/services/authApi';
import { AdminCrmPage } from './AdminCrmPage';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const admin = {
  id: 'admin-id',
  fullName: 'Administrator',
  email: 'admin@example.test',
  role: 'Admin',
  createdAt: '2026-10-13T00:00:00Z',
};
const pageResult = (items: unknown[], pageNumber = 1, totalCount = items.length) => ({
  items,
  pageNumber,
  pageSize: 10,
  totalCount,
  totalPages: Math.ceil(totalCount / 10),
  hasPreviousPage: pageNumber > 1,
  hasNextPage: pageNumber * 10 < totalCount,
});

function setup(role = 'Admin', failUsers = false, failLogout = false, failActivity = false) {
  let activityFailed = false;
  let locked = false;
  let deleted = false;
  saveAuthSession({ token: 'admin-token', user: { ...admin, role } }, true);
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      locked = JSON.parse(String(init.body)).isLocked;
      return { ok: true, status: 204, json: async () => ({}) };
    }
    if (init?.method === 'DELETE') {
      deleted = true;
      return { ok: true, status: 204, json: async () => ({}) };
    }
    if (url.includes('/warnings') || url.includes('/logout-all'))
      return { ok: true, status: 204, json: async () => ({}) };
    if (url.includes('/api/auth/logout'))
      return { ok: !failLogout, status: failLogout ? 500 : 204, json: async () => ({}) };
    if (url.includes('/api/auth/me')) return { ok: true, json: async () => ({ ...admin, role }) };
    if (url.includes('/activity') && failActivity && !activityFailed) {
      activityFailed = true;
      return { ok: false, status: 500, json: async () => ({}) };
    }
    if (url.includes('/activity'))
      return {
        ok: true,
        json: async () => ({
          timeZone: 'Asia/Ho_Chi_Minh',
          days: Array.from({ length: 7 }, (_, index) => ({
            date: `2026-10-${String(9 + index).padStart(2, '0')}`,
            userCount: index === 0 ? 9 : 0,
            imageCount: index === 2 ? 2 : 0,
            sessionCount: index === 6 ? 3 : 0,
          })),
        }),
      };
    if (url.includes('/summary'))
      return { ok: true, json: async () => ({ userCount: 11, imageCount: 2, sessionCount: 3 }) };
    if (url.includes('/users') && failUsers)
      return { ok: false, status: 500, json: async () => ({}) };
    if (url.includes('/users'))
      return {
        ok: true,
        json: async () =>
          pageResult(
            [
              {
                ...admin,
                role: 'User',
                isLocked: locked,
                warningCount: 0,
                fullName: url.includes('pageNumber=2') ? 'Second page account' : 'Database account',
              },
            ],
            url.includes('pageNumber=2') ? 2 : 1,
            11,
          ),
      };
    if (url.includes('/images'))
      return {
        ok: true,
        json: async () =>
          pageResult([
            {
              id: 'image-one',
              predictionId: 'prediction-one',
              userId: admin.id,
              userName: 'Database account',
              userEmail: admin.email,
              imageUrl: null,
              uploadedAt: admin.createdAt,
              expiresAt: admin.createdAt,
              status: deleted ? 'Deleted' : 'Expired',
            },
          ]),
      };
    if (url.includes('/sessions'))
      return {
        ok: true,
        json: async () =>
          pageResult([
            {
              id: 'session-one',
              userId: admin.id,
              userName: 'Database account',
              userEmail: admin.email,
              createdAt: admin.createdAt,
              expiresAt: '2026-10-14T00:00:00Z',
              endedAt: null,
              status: 'Active',
            },
          ]),
      };
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearAuthSession();
});

describe('Database-backed admin CRM', () => {
  it('reveals labels on rail hover and collapses when the pointer leaves', async () => {
    setup();
    render(<AdminCrmPage />);
    await screen.findByText('11');
    expect(screen.queryByRole('button', { name: 'Mở rộng thanh điều hướng' })).toBeNull();
    const rail = screen.getByRole('complementary', { name: 'Thanh điều hướng quản trị' });
    const label = screen.getByText('Người dùng', { selector: '.admin-rail-label' });
    expect(label).not.toBeVisible();
    await userEvent.hover(rail);
    expect(label).toBeVisible();
    await userEvent.unhover(rail);
    expect(label).not.toBeVisible();
    expect(screen.getByRole('button', { name: 'Người dùng' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
  });

  it('reveals labels for keyboard focus and keeps them until focus leaves the rail', async () => {
    setup();
    render(<AdminCrmPage />);
    await screen.findByText('11');
    await userEvent.tab();
    await userEvent.tab();
    const label = screen.getByText('Người dùng', { selector: '.admin-rail-label' });
    expect(label).toBeVisible();
    await userEvent.tab();
    expect(label).toBeVisible();
    await userEvent.click(screen.getByLabelText('Tìm tài khoản theo tên hoặc email'));
    expect(label).not.toBeVisible();
  });
  it('keeps totals available and retries failed daily charts', async () => {
    setup('Admin', false, false, true);
    render(<AdminCrmPage />);
    expect(await screen.findByText('11')).toBeVisible();
    const retries = await screen.findAllByRole('button', { name: 'Tải lại biểu đồ' });
    expect(screen.queryByRole('img', { name: 'Tài khoản mới theo ngày' })).toBeNull();
    await userEvent.click(retries[0]);
    expect(await screen.findByRole('img', { name: 'Tài khoản mới theo ngày' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Tải lại biểu đồ' })).toBeNull();
  });

  it('shows three daily charts from the authenticated aggregate endpoint', async () => {
    const fetchMock = setup();
    render(<AdminCrmPage />);
    expect(await screen.findByRole('img', { name: 'Tài khoản mới theo ngày' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Ảnh tải lên theo ngày' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Lượt đăng nhập theo ngày' })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/activity'),
      expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' } }),
    );
    await userEvent.click(screen.getAllByText('Xem số liệu theo ngày')[0]);
    expect(screen.getByRole('table', { name: 'Tài khoản mới theo ngày' })).toHaveTextContent('9');
  });

  it('shows recent backend sessions and image metadata on the overview', async () => {
    setup();
    render(<AdminCrmPage />);
    const sessions = within(await screen.findByRole('region', { name: 'Phiên gần đây' }));
    expect(await sessions.findByText('Database account')).toBeVisible();
    expect(sessions.getByText('Còn hiệu lực')).toBeVisible();
    const images = within(screen.getByRole('region', { name: 'Ảnh gần đây' }));
    expect(await images.findByText('Ảnh đã hết hạn')).toBeVisible();
    expect(images.queryByRole('img')).toBeNull();
  });

  it('uses dashboard search to open the filtered backend account directory', async () => {
    const fetchMock = setup();
    render(<AdminCrmPage />);
    await screen.findByText('11');
    await userEvent.type(screen.getByLabelText('Tìm tài khoản theo tên hoặc email'), 'Database');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm tài khoản' }));
    expect(await screen.findByRole('heading', { name: 'Người dùng', level: 1 })).toBeVisible();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/users?pageNumber=1&pageSize=10&q=Database'),
        expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' } }),
      ),
    );
    expect(screen.getByLabelText('Tìm theo tên hoặc email người dùng')).toHaveValue('Database');
  });

  it('locks, restores and forcibly signs out a user with confirmed backend actions', async () => {
    const fetchMock = setup();
    render(<AdminCrmPage />);
    await screen.findByText('11');
    await userEvent.click(screen.getByRole('button', { name: 'Người dùng' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Khóa tài khoản' }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.type(dialog.getByLabelText('Lý do'), 'Repeated abuse');
    await userEvent.click(dialog.getByRole('button', { name: 'Xác nhận khóa' }));
    expect(await screen.findByText('Đã khóa')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Khôi phục tài khoản' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận khôi phục' }),
    );
    await screen.findByRole('button', { name: 'Khóa tài khoản' });
    await userEvent.click(screen.getByRole('button', { name: 'Cưỡng chế đăng xuất' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận đăng xuất' }),
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/logout-all'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/lock'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ isLocked: true, reason: 'Repeated abuse' }),
      }),
    );
  });

  it('sends an account warning to the selected user', async () => {
    const fetchMock = setup();
    render(<AdminCrmPage />);
    await screen.findByText('11');
    await userEvent.click(screen.getByRole('button', { name: 'Người dùng' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Gửi cảnh báo' }));
    await userEvent.type(
      within(screen.getByRole('dialog')).getByLabelText('Nội dung cảnh báo'),
      'Please follow the rules',
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Gửi cảnh báo' }),
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/users/admin-id/warnings',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'Please follow the rules' }),
        }),
      ),
    );
  });

  it('warns the image owner and deletes only the selected image after confirmation', async () => {
    const fetchMock = setup();
    render(<AdminCrmPage />);
    await screen.findByText('11');
    await userEvent.click(screen.getByRole('button', { name: 'Ảnh đã tải lên' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cảnh báo ảnh vi phạm' }));
    await userEvent.type(
      within(screen.getByRole('dialog')).getByLabelText('Nội dung cảnh báo'),
      'Inappropriate image',
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Gửi cảnh báo' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await userEvent.click(screen.getByRole('button', { name: 'Xóa ảnh' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận xóa ảnh' }),
    );
    expect(await screen.findByText('Ảnh đã được xóa')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/images/image-one/warnings',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/images/image-one',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it.each(['desktop', 'mobile'])(
    'ends the admin session from the %s logout action',
    async (surface) => {
      const fetchMock = setup();
      render(<AdminCrmPage />);
      await screen.findByText('11');
      if (surface === 'mobile') {
        await userEvent.click(screen.getByRole('button', { name: 'Mở menu quản trị' }));
        await userEvent.click(
          within(screen.getByRole('dialog')).getByRole('button', { name: 'Đăng xuất' }),
        );
      } else {
        await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
      }
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
        }),
      );
      expect(localStorage.getItem('leafai_auth_session')).toBeNull();
      expect(sessionStorage.getItem('leafai_auth_session')).toBeNull();
    },
  );

  it('keeps the session and allows retry when server logout fails', async () => {
    const fetchMock = setup('Admin', false, true);
    render(<AdminCrmPage />);
    await screen.findByText('11');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa thể đăng xuất');
    expect(localStorage.getItem('leafai_auth_session')).not.toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(localStorage.getItem('leafai_auth_session')).toBeNull();
  });

  it('does not expose administration to an anonymous visitor', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<AdminCrmPage />);
    expect(await screen.findByText('Đăng nhập bằng tài khoản Admin để tiếp tục.')).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Điều hướng quản trị' })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('denies a server-verified regular user without fetching admin records', async () => {
    const fetchMock = setup('User');
    render(<AdminCrmPage />);
    expect(await screen.findByText('Tài khoản này không có quyền Admin.')).toBeVisible();
    expect(fetchMock.mock.calls.some(([url]) => url.includes('/api/admin/'))).toBe(false);
  });
  it('loads real summary values and paginates the user directory with bearer authorization', async () => {
    const fetchMock = setup();
    render(<AdminCrmPage />);
    expect(await screen.findByText('11')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Người dùng' }));
    expect(await screen.findByText('Database account')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(await screen.findByText('Second page account')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/users?pageNumber=2'),
      expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' } }),
    );
  });
  it('shows retained image metadata without loading an expired image URL', async () => {
    setup();
    render(<AdminCrmPage />);
    await screen.findByText('11');
    await userEvent.click(screen.getByRole('button', { name: 'Ảnh đã tải lên' }));
    expect(await screen.findByText('Ảnh đã hết hạn')).toBeVisible();
    expect(screen.getByText('Database account')).toBeVisible();
    expect(screen.queryByRole('img', { name: /Ảnh tải lên/ })).toBeNull();
  });
  it('shows persisted session status and account without exposing tokens', async () => {
    setup();
    render(<AdminCrmPage />);
    await screen.findByText('11');
    await userEvent.click(screen.getByRole('button', { name: 'Phiên đăng nhập' }));
    expect(await screen.findByText('Còn hiệu lực')).toBeVisible();
    expect(screen.getByText('Database account')).toBeVisible();
    expect(screen.queryByText('admin-token')).toBeNull();
  });
  it('reports an API failure rather than a false empty result and offers retry', async () => {
    setup('Admin', true);
    render(<AdminCrmPage />);
    await screen.findByText('11');
    await userEvent.click(screen.getByRole('button', { name: 'Người dùng' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải dữ liệu quản trị');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeVisible();
    expect(screen.queryByText('Chưa có dữ liệu người dùng')).toBeNull();
  });
});

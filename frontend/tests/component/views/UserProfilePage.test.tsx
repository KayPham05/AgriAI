import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfilePage } from '@/views/UserProfilePage';

const dto = {
  id: 'one',
  fullName: 'Nguyễn Minh An',
  email: 'an@example.test',
  role: 'User',
  isActive: true,
  createdAt: '2026-10-20T00:00:00Z',
  updatedAt: null,
  emailVerifiedAt: null,
};
const fetcher = vi.fn();
beforeEach(() => {
  fetcher.mockReset().mockImplementation(async (_url: string, init?: RequestInit) => ({
    ok: true,
    status: init?.method === 'POST' ? 204 : 200,
    json: async () => (init?.method === 'PUT' ? { ...dto, fullName: 'Trần Minh' } : dto),
  }));
  vi.stubGlobal('fetch', fetcher);
});
function show() {
  const onLogout = vi.fn();
  const onAccountUpdated = vi.fn();
  render(
    <UserProfilePage
      token="token"
      avatarUrl=""
      onAvatarChange={vi.fn()}
      onAccountUpdated={onAccountUpdated}
      onLogout={onLogout}
    />,
  );
  return { onLogout, onAccountUpdated };
}
describe('Profile Desktop account management', () => {
  it('omits unsupported fields from the profile form', async () => {
    show();
    await screen.findByDisplayValue(dto.fullName);
    for (const label of ['Tên hiển thị riêng', 'Số điện thoại', 'Tỉnh / Thành phố'])
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
    expect(screen.queryByText('Chưa hỗ trợ')).not.toBeInTheDocument();
  });
  it('retries a failed initial load', async () => {
    fetcher.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('thử lại');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByDisplayValue(dto.fullName)).toBeVisible();
  });

  it('prevents duplicate saves while an update is pending', async () => {
    show();
    await screen.findByDisplayValue(dto.fullName);
    let finish!: (value: unknown) => void;
    fetcher.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const form = screen.getByRole('form', { name: 'Chỉnh sửa thông tin cá nhân' });
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(screen.getByRole('button', { name: 'Đang lưu…' })).toBeDisabled();
    expect(fetcher.mock.calls.filter((call) => call[1]?.method === 'PUT')).toHaveLength(1);
    finish({ ok: true, status: 200, json: async () => dto });
    expect(await screen.findByText('Đã cập nhật hồ sơ tài khoản.')).toBeVisible();
  });

  it('preserves the password form after the backend rejects the current password', async () => {
    const { onLogout } = show();
    const user = userEvent.setup();
    await screen.findByDisplayValue(dto.fullName);
    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    await user.type(screen.getByLabelText('Mật khẩu hiện tại'), 'wrongpass');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'newpass');
    await user.type(screen.getByLabelText('Xác nhận mật khẩu mới'), 'newpass');
    fetcher.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Mật khẩu hiện tại không chính xác.' }),
    });
    await user.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Mật khẩu hiện tại không chính xác.',
    );
    expect(onLogout).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cập nhật mật khẩu' })).toBeEnabled();
  });
  it('loads identity from the backend and saves only a trimmed fullName', async () => {
    const { onAccountUpdated } = show();
    const user = userEvent.setup();
    const name = await screen.findByDisplayValue(dto.fullName);
    expect(screen.getByLabelText('Email')).toHaveValue(dto.email);
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
    await user.clear(name);
    await user.type(name, '  Trần Minh  ');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Đã cập nhật hồ sơ tài khoản.')).toBeVisible();
    expect(fetcher).toHaveBeenLastCalledWith(
      '/api/users/profile',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ fullName: 'Trần Minh' }) }),
    );
    expect(onAccountUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Trần Minh' }),
    );
  });
  it('validates names and discards unsaved edits', async () => {
    show();
    const user = userEvent.setup();
    const name = await screen.findByDisplayValue(dto.fullName);
    await user.clear(name);
    await user.type(name, '   ');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Họ và tên không được để trống.');
    fireEvent.change(name, { target: { value: 'A'.repeat(61) } });
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(screen.getByRole('alert')).toHaveTextContent('60 ký tự');
    await user.click(screen.getByRole('button', { name: 'Hủy thay đổi' }));
    expect(name).toHaveValue(dto.fullName);
    expect(fetcher.mock.calls.filter((call) => call[1]?.method === 'PUT')).toHaveLength(0);
  });
  it('keeps draft on save failure and supports retry', async () => {
    show();
    const user = userEvent.setup();
    const name = await screen.findByDisplayValue(dto.fullName);
    await user.clear(name);
    await user.type(name, 'Trần Minh');
    fetcher.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('thử lại');
    expect(name).toHaveValue('Trần Minh');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Đã cập nhật hồ sơ tài khoản.')).toBeVisible();
  });
  it('checks password confirmation and logs out only after a successful 204', async () => {
    const { onLogout } = show();
    const user = userEvent.setup();
    await screen.findByDisplayValue(dto.fullName);
    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    await user.type(screen.getByLabelText('Mật khẩu hiện tại'), 'oldpass');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'newpass');
    await user.type(screen.getByLabelText('Xác nhận mật khẩu mới'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }));
    expect(screen.getByRole('alert')).toHaveTextContent('không khớp');
    expect(onLogout).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('Xác nhận mật khẩu mới'));
    await user.type(screen.getByLabelText('Xác nhận mật khẩu mới'), 'newpass');
    await user.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }));
    await waitFor(() => expect(onLogout).toHaveBeenCalledOnce());
    expect(fetcher).toHaveBeenLastCalledWith(
      '/api/users/change-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'oldpass',
          newPassword: 'newpass',
          confirmPassword: 'newpass',
        }),
      }),
    );
  });
  it('handles expired sessions without showing stale forms', async () => {
    fetcher.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    show();
    expect(await screen.findByText(/Phiên đăng nhập đã hết hạn/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).not.toBeInTheDocument();
  });
});

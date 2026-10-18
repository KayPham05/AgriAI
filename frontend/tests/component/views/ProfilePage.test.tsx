import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types';
import { ProfilePage } from '@/views/ProfilePage';

const profile: UserProfile = {
  name: 'Nguyễn Minh An',
  role: 'Nông dân',
  location: 'Đồng Tháp',
  email: 'minhan@example.test',
  avatarUrl: '',
  joinedDate: '17/10/2026',
};

function showProfile(isAuthenticated = true) {
  const onUpdateProfile = vi.fn();
  const onLogout = vi.fn();
  const onOpenLogin = vi.fn();
  render(
    <ProfilePage
      profile={profile}
      history={[]}
      isAuthenticated={isAuthenticated}
      onUpdateProfile={onUpdateProfile}
      onLogout={onLogout}
      onOpenLogin={onOpenLogin}
    />,
  );
  return { onUpdateProfile, onLogout, onOpenLogin };
}

describe('ProfilePage local display settings', () => {
  it('lets a Guest open login and shows the empty sample state', async () => {
    const { onOpenLogin, onLogout } = showProfile(false);
    expect(screen.getByRole('heading', { name: 'Hồ sơ dùng thử' })).toBeVisible();
    expect(screen.getByText(/Bạn chưa có mẫu nào/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập / Đăng ký' }));
    expect(onOpenLogin).toHaveBeenCalledOnce();
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('discards cancelled edits and starts again with the current profile', async () => {
    const { onUpdateProfile } = showProfile();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Sửa thông tin' }));
    await user.clear(screen.getByRole('textbox', { name: 'Họ và tên' }));
    await user.type(screen.getByRole('textbox', { name: 'Họ và tên' }), 'Tên chưa lưu');
    await user.click(screen.getByRole('button', { name: 'Hủy chỉnh sửa' }));
    expect(onUpdateProfile).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: profile.name })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Sửa thông tin' }));
    expect(screen.getByRole('textbox', { name: 'Họ và tên' })).toHaveValue(profile.name);
  });

  it('blocks blank names and trims display edits while retaining account identity', async () => {
    const { onUpdateProfile } = showProfile();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Sửa thông tin' }));
    const name = screen.getByRole('textbox', { name: 'Họ và tên' });
    await user.clear(name);
    await user.type(name, '   ');
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
    expect(onUpdateProfile).not.toHaveBeenCalled();
    await user.clear(name);
    await user.type(name, '  Trần Minh  ');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(onUpdateProfile).toHaveBeenCalledExactlyOnceWith({ ...profile, name: 'Trần Minh' });
    expect(screen.queryByRole('textbox', { name: 'Họ và tên' })).not.toBeInTheDocument();
  });

  it('calls logout only when a signed-in user requests it', async () => {
    const { onLogout, onOpenLogin } = showProfile();
    expect(screen.getByRole('heading', { name: 'Hồ sơ của tôi' })).toBeVisible();
    expect(onLogout).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(onLogout).toHaveBeenCalledOnce();
    expect(onOpenLogin).not.toHaveBeenCalled();
  });
});

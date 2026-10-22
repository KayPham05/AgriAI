import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types';
import { ProfilePage } from '@/views/ProfilePage';
import { successfulPrediction } from '../../helpers/prediction';

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

  it('announces that display changes were saved for this session only', async () => {
    showProfile();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Sửa thông tin' }));
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(screen.getByRole('status')).toHaveTextContent('Đã cập nhật thông tin trong phiên này.');
    await user.click(screen.getByRole('button', { name: 'Sửa thông tin' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps profile details readable when optional fields are missing', () => {
    render(
      <ProfilePage
        profile={{ ...profile, role: '', email: '', location: '' }}
        history={[]}
        isAuthenticated
        onUpdateProfile={vi.fn()}
        onOpenLogin={vi.fn()}
        onLogout={vi.fn()}
      />,
    );
    const details = screen.getByRole('region', { name: 'Thông tin cá nhân' });
    expect(within(details).getByText(profile.name)).toBeVisible();
    expect(within(details).getAllByText('Chưa cập nhật')).toHaveLength(3);
  });

  it('shows sample counts derived from the supplied history', () => {
    render(
      <ProfilePage
        profile={profile}
        history={[
          { ...successfulPrediction.diagnosis, id: 'healthy', isHealthy: true },
          { ...successfulPrediction.diagnosis, id: 'disease-one', isHealthy: false },
          { ...successfulPrediction.diagnosis, id: 'disease-two', isHealthy: false },
        ]}
        isAuthenticated
        onUpdateProfile={vi.fn()}
        onOpenLogin={vi.fn()}
        onLogout={vi.fn()}
      />,
    );
    const stats = screen.getByRole('region', { name: 'Mẫu đã lưu' });
    for (const [label, value] of [
      ['Tổng số mẫu', '3'],
      ['Dự đoán khỏe mạnh', '1'],
      ['Dự đoán có bệnh', '2'],
    ]) {
      expect(within(stats).getByText(label).nextElementSibling).toHaveTextContent(value);
    }
    expect(within(stats).queryByText(/Bạn chưa có mẫu nào/)).not.toBeInTheDocument();
  });
});

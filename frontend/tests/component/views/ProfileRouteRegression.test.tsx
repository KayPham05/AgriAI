import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileRoute } from '@/features/profile/ProfileRoute';

vi.mock('@/providers/AppContexts', () => ({
  useAuth: () => ({
    session: { token: 'profile-session' },
    profile: { name: 'Nguyễn An', avatarUrl: '', joinedDate: '05/11/2026' },
    updateProfile: vi.fn(),
    updateAccount: vi.fn(),
    openAuthentication: vi.fn(),
    logout: vi.fn(),
  }),
  useHistory: () => ({ history: [] }),
  useFeedback: () => ({ openNotifications: vi.fn() }),
}));

describe('signed-in profile route regression', () => {
  it('uses the Backend Improvement account screen instead of the legacy trial profile', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => ({
        ok: true,
        json: async () =>
          url.includes('two-factor')
            ? { enabled: false }
            : {
                id: 'profile-user',
                fullName: 'Nguyễn An',
                email: 'an@example.test',
                role: 'User',
                isActive: true,
                createdAt: '2026-11-05T00:00:00Z',
                updatedAt: null,
                emailVerifiedAt: null,
                avatarUrl: null,
              },
      })),
    );
    render(<ProfileRoute />);
    expect(await screen.findByRole('heading', { name: 'Hồ sơ của bạn' })).toBeVisible();
    expect(await screen.findByRole('form', { name: 'Chỉnh sửa thông tin cá nhân' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Cài đặt tài khoản' })).toBeVisible();
    const security = screen.getByRole('region', { name: 'Bảo mật tài khoản' });
    expect(
      await within(security).findByRole('checkbox', { name: 'Xác thực hai lớp qua email' }),
    ).toBeVisible();
    expect(within(security).getByRole('button', { name: 'Đổi mật khẩu' })).toBeVisible();
  });
});

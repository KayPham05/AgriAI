import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import App from './test/AppHarness';
import { login, restoreAuthSession, clearAuthSession } from './services/authApi';
import { getPlants, getDiseases } from './services/catalogApi';
import { getPredictionHistory } from './services/predictionApi';

vi.mock('./services/authApi', () => ({
  restoreAuthSession: vi.fn(),
  clearAuthSession: vi.fn(),
  logoutSession: vi.fn().mockResolvedValue(undefined),
  login: vi.fn(),
  saveAuthSession: vi.fn(),
}));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => router }));
vi.mock('./services/catalogApi', () => ({ getPlants: vi.fn(), getDiseases: vi.fn() }));
vi.mock('./services/predictionApi', () => ({
  getPredictionHistory: vi.fn(),
  deletePrediction: vi.fn(),
  getPredictionById: vi.fn(),
}));

const session = {
  token: 'test',
  user: {
    id: '1',
    fullName: 'Nguyễn Văn An',
    email: 'an@example.test',
    role: 'User',
    createdAt: '2026-01-01T00:00:00Z',
  },
};

describe('authenticated app startup', () => {
  it('loads persisted warnings and marks them read through the backend', async () => {
    vi.mocked(restoreAuthSession).mockResolvedValue(session);
    vi.mocked(getPlants).mockResolvedValue([]);
    vi.mocked(getDiseases).mockResolvedValue([]);
    vi.mocked(getPredictionHistory).mockResolvedValue([]);
    let readAt: string | null = null;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') {
          readAt = '2026-10-14T00:00:00Z';
          return { ok: true, status: 204 };
        }
        return {
          ok: true,
          json: async () => [
            {
              id: 'notice',
              title: 'Cảnh báo về tài khoản',
              message: 'Please follow the rules',
              createdAt: '2026-10-14T00:00:00Z',
              readAt,
              imageId: null,
            },
          ],
        };
      }),
    );
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' }));
    expect(await screen.findByText('Please follow the rules')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Đánh dấu đã đọc' }));
    await waitFor(() => expect(screen.queryByText('Chưa đọc')).toBeNull());
  });

  it('returns to login when a background account check finds a revoked session', async () => {
    vi.mocked(restoreAuthSession).mockResolvedValue(session);
    vi.mocked(getPlants).mockResolvedValue([]);
    vi.mocked(getDiseases).mockResolvedValue([]);
    vi.mocked(getPredictionHistory).mockResolvedValue([]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    render(<App />);
    await waitFor(() => expect(clearAuthSession).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: 'Đăng nhập' })).toBeVisible();
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('opens admin after restoring an Admin session without waiting for the user catalog', async () => {
    vi.mocked(restoreAuthSession).mockResolvedValue({
      ...session,
      user: { ...session.user, role: 'Admin' },
    });
    vi.mocked(getPlants).mockReturnValue(new Promise(() => {}));
    render(<App />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin'));
    expect(getPlants).not.toHaveBeenCalled();
    expect(getPredictionHistory).not.toHaveBeenCalled();
  });

  it.each(['Admin', 'User'])('routes a fresh %s login to its own workspace', async (role) => {
    vi.mocked(restoreAuthSession).mockResolvedValue(null);
    vi.mocked(login).mockResolvedValue({ ...session, user: { ...session.user, role } });
    vi.mocked(getPlants).mockResolvedValue([]);
    vi.mocked(getDiseases).mockResolvedValue([]);
    vi.mocked(getPredictionHistory).mockResolvedValue([]);
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Đăng nhập' }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.type(dialog.getByLabelText(/^Email$/i), 'an@example.test');
    await userEvent.type(dialog.getByLabelText(/^Mật khẩu$/i), 'test-password');
    const captcha = dialog.getByRole('group', { name: /^Mã CAPTCHA: / });
    await userEvent.type(
      dialog.getByLabelText(/Mã xác nhận/i),
      captcha.getAttribute('aria-label')?.replace('Mã CAPTCHA: ', '') ?? '',
    );
    await userEvent.click(dialog.getByRole('button', { name: 'Đăng nhập' }));
    if (role === 'Admin') {
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin'));
      expect(getPlants).not.toHaveBeenCalled();
      expect(getPredictionHistory).not.toHaveBeenCalled();
    } else {
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
      expect(router.replace).not.toHaveBeenCalledWith('/admin');
    }
  });

  it('waits for real startup data, then enters home without a button', async () => {
    vi.mocked(restoreAuthSession).mockResolvedValue(session);
    let resolveHistory!: (value: []) => void;
    vi.mocked(getPredictionHistory).mockReturnValue(
      new Promise((resolve) => {
        resolveHistory = resolve;
      }),
    );
    vi.mocked(getPlants).mockResolvedValue([]);
    vi.mocked(getDiseases).mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Chào Nguyễn Văn An.' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Vào ứng dụng/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mở menu' })).toBeNull();
    resolveHistory([]);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mở menu' })).toBeVisible());
  });
  it('does not enter home on a failed connection and allows retry', async () => {
    vi.mocked(restoreAuthSession).mockResolvedValue(session);
    vi.mocked(getPlants).mockRejectedValue(new Error('Không thể kết nối.'));
    vi.mocked(getDiseases).mockResolvedValue([]);
    vi.mocked(getPredictionHistory).mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối.');
    expect(screen.queryByRole('button', { name: 'Mở menu' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeEnabled();
    vi.mocked(getPlants).mockResolvedValue([]);
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mở menu' })).toBeVisible());
  });
});

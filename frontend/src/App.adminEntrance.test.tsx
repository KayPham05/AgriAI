import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './test/AppHarness';
import { login, restoreAuthSession } from './services/authApi';
import { getPlants, getDiseases } from './services/catalogApi';
import { getPredictionHistory } from './services/predictionApi';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => router }));
vi.mock('./services/authApi', () => ({
  restoreAuthSession: vi.fn(),
  login: vi.fn(),
  saveAuthSession: vi.fn(),
  clearAuthSession: vi.fn(),
  logoutSession: vi.fn(),
}));
vi.mock('./services/catalogApi', () => ({ getPlants: vi.fn(), getDiseases: vi.fn() }));
vi.mock('./services/predictionApi', () => ({
  getPredictionHistory: vi.fn(),
  deletePrediction: vi.fn(),
  getPredictionById: vi.fn(),
}));
vi.mock('./components/common/LoginSuccessScreen', () => ({
  LoginSuccessScreen: ({
    userName,
    onAnimationComplete,
  }: {
    userName: string;
    onAnimationComplete: () => void;
  }) => (
    <section role="status" aria-label="Admin entrance under test">
      <h1>Chào {userName}.</h1>
      <button type="button" onClick={onAnimationComplete}>
        Finish test entrance
      </button>
    </section>
  ),
}));
const session = {
  token: 'admin-test-token',
  user: {
    id: 'admin',
    fullName: 'System Admin',
    email: 'admin@example.test',
    role: 'Admin',
    createdAt: '2026-10-01T00:00:00Z',
  },
};

describe('Admin entrance routing', () => {
  it.each(['restored', 'fresh'])(
    'waits for the entrance before redirecting a %s admin session',
    async (mode) => {
      router.replace.mockClear();
      vi.mocked(restoreAuthSession).mockResolvedValue(mode === 'restored' ? session : null);
      vi.mocked(login).mockResolvedValue(session);
      render(<App />);
      if (mode === 'fresh') {
        await userEvent.click(await screen.findByRole('button', { name: 'Đăng nhập' }));
        const dialog = within(screen.getByRole('dialog'));
        await userEvent.type(dialog.getByLabelText(/^Email$/i), session.user.email);
        await userEvent.type(dialog.getByLabelText(/^Mật khẩu$/i), 'test-password');
        const captcha = dialog.getByRole('group', { name: /^Mã CAPTCHA: / });
        await userEvent.type(
          dialog.getByLabelText(/Mã xác nhận/i),
          captcha.getAttribute('aria-label')?.replace('Mã CAPTCHA: ', '') ?? '',
        );
        await userEvent.click(dialog.getByRole('button', { name: 'Đăng nhập' }));
      }
      expect(await screen.findByRole('heading', { name: 'Chào System Admin.' })).toBeVisible();
      expect(router.replace).not.toHaveBeenCalledWith('/admin');
      expect(getPlants).not.toHaveBeenCalled();
      expect(getDiseases).not.toHaveBeenCalled();
      expect(getPredictionHistory).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: 'Finish test entrance' }));
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin'));
    },
  );
});

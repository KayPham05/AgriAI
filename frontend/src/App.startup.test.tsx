import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import App from './test/AppHarness';
import { restoreAuthSession } from './services/authApi';
import { getPlants, getDiseases } from './services/catalogApi';
import { getPredictionHistory } from './services/predictionApi';

vi.mock('./services/authApi', () => ({ restoreAuthSession: vi.fn(), clearAuthSession: vi.fn() }));
vi.mock('next/navigation', () => {
  const router = { push: vi.fn(), replace: vi.fn() };
  return { usePathname: () => '/', useRouter: () => router };
});
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

import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '@/providers/AppProvider';
import { useAuth } from '@/providers/AppContexts';
import { clearAuthSession, restoreAuthSession, revokeSession } from '@/services/authApi';
import { getPlants, getDiseases } from '@/services/catalogApi';
import { getPredictionHistory } from '@/services/predictionApi';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => router }));
vi.mock('@/services/authApi', () => ({
  restoreAuthSession: vi.fn(),
  clearAuthSession: vi.fn(),
  revokeSession: vi.fn(),
}));
vi.mock('@/services/catalogApi', () => ({ getPlants: vi.fn(), getDiseases: vi.fn() }));
vi.mock('@/services/predictionApi', () => ({
  getPredictionHistory: vi.fn(),
  deletePrediction: vi.fn(),
  getPredictionById: vi.fn(),
}));

function Workspace() {
  const { session, logout } = useAuth();
  return (
    <>
      <p>{session ? 'Private workspace' : 'Public introduction'}</p>
      <button type="button" onClick={logout}>
        Sign out
      </button>
    </>
  );
}

describe('logout farewell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(revokeSession).mockResolvedValue(undefined);
    vi.mocked(restoreAuthSession).mockResolvedValue({
      token: 'isolated',
      user: {
        id: '1',
        fullName: 'Nguyễn Văn An',
        email: 'an@example.test',
        role: 'User',
        createdAt: '2026-10-20',
      },
    });
    vi.mocked(getPlants).mockResolvedValue([]);
    vi.mocked(getDiseases).mockResolvedValue([]);
    vi.mocked(getPredictionHistory).mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it('clears authentication immediately, shows the departing name, then returns to the public page', async () => {
    await act(async () =>
      render(
        <AppProvider>
          <Workspace />
        </AppProvider>,
      ),
    );
    expect(screen.getByText('Private workspace')).toBeVisible();
    await act(async () => screen.getByRole('button', { name: 'Sign out' }).click());
    expect(revokeSession).toHaveBeenCalledWith('isolated');
    expect(clearAuthSession).toHaveBeenCalledOnce();
    expect(screen.queryByText('Private workspace')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Tạm biệt, Nguyễn Văn An.' })).toBeVisible();
    expect(screen.queryByText(/Xin chào/)).toBeNull();
    act(() => vi.advanceTimersByTime(3999));
    expect(screen.getByRole('heading', { name: 'Tạm biệt, Nguyễn Văn An.' })).toBeVisible();
    expect(screen.queryByText('Public introduction')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('Public introduction')).toBeVisible();
    expect(screen.queryByText(/Tạm biệt/)).toBeNull();
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(getPlants).toHaveBeenCalledOnce();
  });

  it('keeps the session and reports failure when revocation fails', async () => {
    vi.mocked(revokeSession).mockRejectedValueOnce(new Error('offline'));
    await act(async () =>
      render(
        <AppProvider>
          <Workspace />
        </AppProvider>,
      ),
    );
    await act(async () => screen.getByRole('button', { name: 'Sign out' }).click());
    expect(screen.getByText('Private workspace')).toBeVisible();
    expect(screen.queryByText('Tạm biệt, Nguyễn Văn An.')).toBeNull();
    expect(clearAuthSession).not.toHaveBeenCalled();
    await act(async () => screen.getByRole('button', { name: 'Sign out' }).click());
    expect(clearAuthSession).toHaveBeenCalledOnce();
  });

  it('cleans up the farewell timer when the provider unmounts', async () => {
    let unmount!: () => void;
    await act(async () => {
      unmount = render(
        <AppProvider>
          <Workspace />
        </AppProvider>,
      ).unmount;
    });
    await act(async () => screen.getByRole('button', { name: 'Sign out' }).click());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

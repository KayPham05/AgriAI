import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '@/providers/AppProvider';
import { useAuth } from '@/providers/AppContexts';
import { restoreAuthSession, type AuthSession } from '@/services/authApi';
import { getPlants, getDiseases } from '@/services/catalogApi';
import { getPredictionHistory } from '@/services/predictionApi';

const fixtures = vi.hoisted(() => ({ role: 'User', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: fixtures.replace }),
}));
vi.mock('@/services/authApi', () => ({ restoreAuthSession: vi.fn(), clearAuthSession: vi.fn() }));
vi.mock('@/services/catalogApi', () => ({ getPlants: vi.fn(), getDiseases: vi.fn() }));
vi.mock('@/services/agriculturalProfileApi', () => ({
  getAgriculturalProfiles: vi.fn().mockResolvedValue([]),
  createAgriculturalProfile: vi.fn(),
  updateAgriculturalProfile: vi.fn(),
  deleteAgriculturalProfile: vi.fn(),
}));
vi.mock('@/services/predictionApi', () => ({
  getPredictionHistory: vi.fn(),
  deletePrediction: vi.fn(),
  getPredictionById: vi.fn(),
}));
vi.mock('@/components/modals/LoginModal', () => ({
  LoginModal: ({
    isOpen,
    onAuthSuccess,
  }: {
    isOpen: boolean;
    onAuthSuccess: (session: AuthSession) => void;
  }) =>
    isOpen ? (
      <button
        type="button"
        onClick={() =>
          onAuthSuccess({
            token: 'fixture',
            user: {
              id: '1',
              fullName: 'An',
              email: 'an@example.test',
              role: fixtures.role,
              createdAt: '2026-10-20',
            },
          })
        }
      >
        Complete sign-in
      </button>
    ) : null,
}));
vi.mock('@/features/admin/AdminLoginSuccessScreen', () => ({
  AdminLoginSuccessScreen: ({ onAnimationComplete }: { onAnimationComplete: () => void }) => (
    <button type="button" onClick={onAnimationComplete}>
      Finish admin animation
    </button>
  ),
}));

function Workspace() {
  const { session, openAuthentication } = useAuth();
  return (
    <>
      <p>{session ? 'Authenticated workspace' : 'Public introduction'}</p>
      <button type="button" onClick={() => openAuthentication('login')}>
        Sign in
      </button>
    </>
  );
}

async function signIn() {
  await act(async () => {
    render(
      <AppProvider>
        <Workspace />
      </AppProvider>,
    );
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Complete sign-in' }));
  });
}

describe('authentication announcement timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fixtures.replace.mockClear();
    vi.mocked(restoreAuthSession).mockResolvedValue(null);
    vi.mocked(getPlants).mockResolvedValue([]);
    vi.mocked(getDiseases).mockResolvedValue([]);
    vi.mocked(getPredictionHistory).mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it.each(['User', 'Admin'])(
    'waits four seconds before entering a fresh %s workspace',
    async (role) => {
      fixtures.role = role;
      await signIn();
      if (role === 'Admin')
        fireEvent.click(screen.getByRole('button', { name: 'Finish admin animation' }));
      act(() => vi.advanceTimersByTime(3999));
      expect(fixtures.replace).not.toHaveBeenCalledWith(role === 'Admin' ? '/admin' : '/home');
      expect(screen.queryByText('Authenticated workspace')).toBeNull();
      act(() => vi.advanceTimersByTime(1));
      expect(fixtures.replace).toHaveBeenCalledWith(role === 'Admin' ? '/admin' : '/home');
    },
  );

  it('still waits for essential data if it takes longer than four seconds', async () => {
    fixtures.role = 'User';
    let finish!: (value: []) => void;
    vi.mocked(getPredictionHistory).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await signIn();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText('Authenticated workspace')).toBeNull();
    await act(async () => finish([]));
    expect(screen.getByText('Authenticated workspace')).toBeVisible();
  });

  it('cleans up the login announcement timer on unmount', async () => {
    fixtures.role = 'User';
    await signIn();
    cleanup();
    expect(vi.getTimerCount()).toBe(0);
  });
});

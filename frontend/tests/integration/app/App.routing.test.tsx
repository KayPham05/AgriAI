import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../helpers/AppHarness';
import DiagnoseRoute from '@/app/(website)/(application)/diagnose/page';
import { SUPPORTED_PLANTS, ALL_DISEASES } from '@/data/plantData';
import { restoreAuthSession } from '@/services/authApi';
import { getPlants, getDiseases } from '@/services/catalogApi';
import { getPredictionHistory } from '@/services/predictionApi';

vi.mock('@/services/authApi', () => ({
  restoreAuthSession: vi.fn(),
  clearAuthSession: vi.fn(),
}));
vi.mock('@/services/catalogApi', () => ({ getPlants: vi.fn(), getDiseases: vi.fn() }));
vi.mock('@/services/predictionApi', () => ({
  getPredictionHistory: vi.fn(),
  deletePrediction: vi.fn(),
  getPredictionById: vi.fn(),
}));

vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ href, children, onClick, ...props }: React.ComponentProps<'a'>) =>
      createElement(
        'a',
        {
          ...props,
          href,
          onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
            onClick?.(event);
            if (
              event.defaultPrevented ||
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey ||
              event.altKey ||
              event.button !== 0
            )
              return;
            event.preventDefault();
            window.history.pushState({}, '', href);
            window.dispatchEvent(new PopStateEvent('popstate'));
          },
        },
        children,
      ),
  };
});

// Next's router is external to jsdom; keep browser history and rendered App real.
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  const navigate = (path: string, replace = false) => {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  const router = {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, true),
  };
  return {
    useRouter: () => router,
    usePathname: () =>
      useSyncExternalStore(
        (notify) => {
          window.addEventListener('popstate', notify);
          return () => window.removeEventListener('popstate', notify);
        },
        () => window.location.pathname,
        () => '/',
      ),
  };
});

describe('URL-driven app navigation', () => {
  beforeEach(() => {
    vi.mocked(restoreAuthSession).mockResolvedValue({
      token: 'test',
      user: {
        id: '1',
        fullName: 'Người kiểm tra',
        email: 'review@example.test',
        role: 'User',
        createdAt: '2026-01-01T00:00:00Z',
      },
    });
    vi.mocked(getPlants).mockResolvedValue(SUPPORTED_PLANTS);
    vi.mocked(getDiseases).mockResolvedValue(ALL_DISEASES);
    vi.mocked(getPredictionHistory).mockResolvedValue([]);
  });

  it('restores the requested diagnose page instead of resetting to home', async () => {
    window.history.replaceState({}, '', '/diagnose');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Kiểm tra ảnh lá cây' })).toBeVisible();
    expect(window.location.pathname).toBe('/diagnose');
  });

  it('renders the page supplied by the route instead of choosing its content in the shell', async () => {
    window.history.replaceState({}, '', '/home');
    render(
      <App>
        <DiagnoseRoute />
      </App>,
    );
    expect(await screen.findByRole('heading', { name: 'Kiểm tra ảnh lá cây' })).toBeVisible();
  });

  it('updates the URL on navigation and restores the view on browser history changes', async () => {
    window.history.replaceState({}, '', '/diagnose');
    render(<App />);
    await screen.findByRole('heading', { name: 'Kiểm tra ảnh lá cây' });
    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).getByRole('link', {
        name: 'Cây trồng',
      }),
    );
    await waitFor(() => expect(window.location.pathname).toBe('/plants'));
    act(() => {
      window.history.replaceState({}, '', '/diagnose');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByRole('heading', { name: 'Kiểm tra ảnh lá cây' })).toBeVisible();
  });

  it('shows a direct plant detail URL after session restoration', async () => {
    const plant = SUPPORTED_PLANTS[0];
    window.history.replaceState({}, '', `/plants/${encodeURIComponent(plant.id)}`);
    render(<App />);
    expect(await screen.findByRole('heading', { name: plant.name, level: 1 })).toBeVisible();
  });

  it('does not replace an unknown plant ID with the plant list', async () => {
    window.history.replaceState({}, '', '/plants/missing-id');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Không tìm thấy cây trồng' })).toBeVisible();
  });

  it('redirects unauthenticated direct navigation to the introduction', async () => {
    vi.mocked(restoreAuthSession).mockResolvedValue(null);
    window.history.replaceState({}, '', '/history');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  });

  it('opens home at its canonical URL after restoring a session on the introduction', async () => {
    window.history.replaceState({}, '', '/');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/home'));
    expect(screen.getByRole('button', { name: 'Mở menu' })).toBeVisible();
  });
});

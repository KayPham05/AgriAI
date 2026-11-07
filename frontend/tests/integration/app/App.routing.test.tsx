import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../helpers/AppHarness';
import { PublicCatalog } from '@/features/knowledge/PublicCatalog';
import { json, page } from '../../helpers/knowledge';
import DiagnoseRoute from '@/app/(website)/(application)/diagnose/page';
import { SUPPORTED_PLANTS, ALL_DISEASES } from '@/data/plantData';
import { login, restoreAuthSession } from '@/services/authApi';
import { getPlants, getDiseases } from '@/services/catalogApi';
import {
  getPredictionHistory,
  readGuestPredictionImage,
  saveGuestPrediction,
} from '@/services/predictionApi';
import {
  readGuestPredictionDraft,
  writeGuestPredictionDraft,
} from '@/features/diagnosis/guestPredictionDraft';
import { successfulPrediction } from '../../helpers/prediction';

vi.mock('@/services/authApi', () => ({
  restoreAuthSession: vi.fn(),
  clearAuthSession: vi.fn(),
  login: vi.fn(),
  saveAuthSession: vi.fn(),
}));
vi.mock('@/services/catalogApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/catalogApi')>()),
  getPlants: vi.fn(),
  getDiseases: vi.fn(),
}));
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
  readGuestPredictionImage: vi.fn(),
  saveGuestPrediction: vi.fn(),
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
    useSearchParams: () => new URLSearchParams(window.location.search),
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
  afterEach(() => sessionStorage.clear());

  it('keeps the guest result mounted through the real login dialog and saves it after authentication', async () => {
    vi.mocked(restoreAuthSession).mockResolvedValue(null);
    vi.mocked(login).mockResolvedValue({
      token: 'owner-token',
      user: {
        id: 'owner',
        fullName: 'Owner',
        email: 'owner@example.test',
        role: 'User',
        createdAt: '2026-01-01T00:00:00Z',
      },
    });
    vi.mocked(readGuestPredictionImage).mockResolvedValue(
      new Blob(['leaf'], { type: 'image/jpeg' }),
    );
    vi.mocked(saveGuestPrediction).mockResolvedValue(successfulPrediction);
    writeGuestPredictionDraft({
      ...successfulPrediction,
      dto: { ...successfulPrediction.dto, guestToken: 'guest-token' },
    });
    window.history.replaceState({}, '', '/diagnose');
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu kết quả vào tài khoản' }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.type(dialog.getByLabelText(/^Email$/i), 'owner@example.test');
    await userEvent.type(dialog.getByLabelText(/^Mật khẩu$/i), 'test-password');
    const captcha = dialog.getByRole('group', { name: /^Mã CAPTCHA: / });
    await userEvent.type(
      dialog.getByLabelText(/Mã xác nhận/i),
      captcha.getAttribute('aria-label')?.replace('Mã CAPTCHA: ', '') ?? '',
    );
    await userEvent.click(dialog.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByText('Đã lưu kết quả vào lịch sử tài khoản.')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Bệnh cháy lá sớm' })).toBeVisible();
    expect(window.location.pathname).toBe('/diagnose');
    expect(saveGuestPrediction).toHaveBeenCalledExactlyOnceWith('guest-token', 'owner-token');
    expect(getPredictionHistory).not.toHaveBeenCalled();
    expect(readGuestPredictionDraft()).toBeNull();
  }, 10000);

  it('lets a guest enter diagnosis from public navigation without requesting account history', async () => {
    vi.mocked(restoreAuthSession).mockResolvedValue(null);
    window.history.replaceState({}, '', '/plants');
    render(<App />);
    await userEvent.click(await screen.findByRole('link', { name: 'Kiểm tra lá' }));
    expect(await screen.findByRole('heading', { name: 'Chẩn đoán ảnh lá' })).toBeVisible();
    expect(window.location.pathname).toBe('/diagnose');
    expect(screen.getByLabelText(/Chọn ảnh lá cây/i)).toBeInTheDocument();
    expect(getPredictionHistory).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Hồ sơ nông nghiệp' })).not.toBeInTheDocument();
  });

  it('retains the public about route for a guest instead of redirecting to the introduction', async () => {
    vi.mocked(restoreAuthSession).mockResolvedValue(null);
    window.history.replaceState({}, '', '/about');
    render(<App />);
    await act(async () => {});
    expect(window.location.pathname).toBe('/about');
    expect(
      within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).getByRole('link', {
        name: 'Về dự án',
      }),
    ).toHaveAttribute('aria-current', 'page');
    expect(getPredictionHistory).not.toHaveBeenCalled();
  });

  it('opens agricultural profile management from the main navigation', async () => {
    window.history.replaceState({}, '', '/diagnose');
    render(<App />);
    await screen.findByRole('heading', { name: 'Chẩn đoán ảnh lá' });
    const navigation = within(screen.getByRole('navigation', { name: 'Điều hướng chính' }));
    await userEvent.click(await navigation.findByRole('link', { name: 'Hồ sơ nông nghiệp' }));
    expect(await screen.findByRole('heading', { name: 'Chưa có hồ sơ' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/agricultural-profiles');
    // Private startup remounts the shell, so query its current navigation.
    expect(
      within(screen.getByRole('navigation', { name: 'Điều hướng chính' })).getByRole('link', {
        name: 'Hồ sơ nông nghiệp',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });
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
    expect(await screen.findByRole('heading', { name: 'Chẩn đoán ảnh lá' })).toBeVisible();
    expect(window.location.pathname).toBe('/diagnose');
  });

  it('renders the page supplied by the route instead of choosing its content in the shell', async () => {
    window.history.replaceState({}, '', '/home');
    render(
      <App>
        <DiagnoseRoute />
      </App>,
    );
    expect(await screen.findByRole('heading', { name: 'Chẩn đoán ảnh lá' })).toBeVisible();
  });

  it('updates the URL on navigation and restores the view on browser history changes', async () => {
    window.history.replaceState({}, '', '/diagnose');
    render(<App />);
    await screen.findByRole('heading', { name: 'Chẩn đoán ảnh lá' });
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
    expect(screen.getByRole('heading', { name: 'Chẩn đoán ảnh lá' })).toBeVisible();
  });

  it('shows a direct plant detail URL after session restoration', async () => {
    const plant = SUPPORTED_PLANTS[0];
    window.history.replaceState({}, '', `/plants/${encodeURIComponent(plant.id)}`);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const path = new URL(url, 'http://localhost').pathname;
        if (path.includes('plant-diseases')) return json(page([]));
        if (path === '/api/diseases') return json([]);
        const record = { id: plant.id, name: plant.name, isActive: true, createdAt: '' };
        return json(path === '/api/plants' ? [record] : record);
      }),
    );
    // The current Next plant-detail route uses the public API catalog.
    render(
      <App>
        <PublicCatalog kind="plants" id={plant.id} />
      </App>,
    );
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

  it('keeps guest catalog URLs accessible without requesting private history', async () => {
    vi.mocked(restoreAuthSession).mockResolvedValue(null);
    window.history.replaceState({}, '', '/plants');
    render(
      <App>
        <p>Danh mục công khai</p>
      </App>,
    );
    expect(await screen.findByText('Danh mục công khai')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Tra cứu thuốc' })).toHaveAttribute(
      'href',
      '/medicines',
    );
    expect(window.location.pathname).toBe('/plants');
    expect(getPredictionHistory).not.toHaveBeenCalled();
  });

  it('defers private startup while a signed-in user reads public content', async () => {
    window.history.replaceState({}, '', '/plants');
    render(
      <App>
        <p>Tra cứu độc lập</p>
      </App>,
    );
    await act(async () => {});
    expect(screen.getByText('Tra cứu độc lập')).toBeVisible();
    expect(getPredictionHistory).not.toHaveBeenCalled();
    act(() => {
      window.history.replaceState({}, '', '/history');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => expect(getPredictionHistory).toHaveBeenCalledWith('test'));
  });

  it('opens home at its canonical URL after restoring a session on the introduction', async () => {
    window.history.replaceState({}, '', '/');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/home'));
    expect(screen.getByRole('button', { name: 'Mở menu' })).toBeVisible();
  });
});

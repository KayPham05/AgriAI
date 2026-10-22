import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomeBannerSlideshow } from '@/components/home/HomeBannerSlideshow';

afterEach(() => vi.useRealTimers());

function loadNextScene(container: HTMLElement) {
  const photo = container.querySelector('img[data-banner-next]');
  fireEvent.load(photo as Element);
  const scene = photo?.closest('[data-home-banner-scene]');
  scene?.querySelectorAll('[data-home-banner-leaves] img').forEach((image) => {
    fireEvent.load(image);
  });
}

describe('HomeBannerSlideshow', () => {
  it('preloads foliage and keeps the previous scene while photo and leaves fade together', async () => {
    vi.useFakeTimers();
    const { container } = render(<HomeBannerSlideshow />);
    const nextPhoto = container.querySelector('img[data-banner-next]') as Element;
    const nextScene = nextPhoto.closest('[data-home-banner-scene]');
    expect(nextScene?.querySelector('[data-home-banner-leaves="rice"]')).not.toBeNull();
    await act(async () => fireEvent.load(nextPhoto));
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Người hái chè giữa những luống chè trên đồi',
    );
    await act(async () => loadNextScene(container));
    act(() => vi.advanceTimersByTime(6000));
    const activePhoto = screen.getByRole('img');
    expect(activePhoto.closest('[data-home-banner-scene="active"]')).toContainElement(
      container.querySelector(
        '[data-home-banner-scene="active"] [data-home-banner-leaves="rice"]',
      ) as HTMLElement,
    );
    expect(
      container.querySelector(
        '[data-home-banner-scene="previous"] [data-home-banner-leaves="tea"]',
      ),
    ).not.toBeNull();
    // React uses the WebKit event in jsdom, which does not expose AnimationEvent.
    fireEvent(
      activePhoto.closest('[data-home-banner-scene="active"]') as Element,
      new Event('webkitAnimationEnd', { bubbles: true }),
    );
    expect(container.querySelector('[data-home-banner-scene="previous"]')).toBeNull();
  });
  it('matches decorative foliage to the active crop when the banner changes', async () => {
    vi.useFakeTimers();
    const { container } = render(<HomeBannerSlideshow />);
    const decoration = container.querySelector('[data-home-banner-leaves]');
    expect(decoration).toHaveAttribute('aria-hidden', 'true');
    const source = () =>
      decodeURIComponent(decoration?.querySelector('img')?.getAttribute('src') ?? '');
    expect(source()).toContain('tea-foliage-cutout');
    await act(async () => {
      loadNextScene(container);
    });
    act(() => vi.advanceTimersByTime(6000));
    expect(
      decodeURIComponent(
        container
          .querySelector('[data-home-banner-scene="active"] [data-home-banner-leaves] img')
          ?.getAttribute('src') ?? '',
      ),
    ).toContain('rice-stalk-cutout');
  });
  it('waits for the next image before rotating through every banner and looping', async () => {
    vi.useFakeTimers();
    const { container, unmount } = render(<HomeBannerSlideshow />);
    const names = new Set<string>();
    for (let i = 0; i < 14; i++) {
      names.add(screen.getByRole('img').getAttribute('alt') ?? '');
      const next = container.querySelector('img[data-banner-next]');
      expect(next).not.toBeNull();
      act(() => vi.advanceTimersByTime(6000));
      expect(screen.getByRole('img')).toHaveAttribute('alt', [...names].at(-1));
      await act(async () => {
        loadNextScene(container);
      });
      act(() => vi.advanceTimersByTime(6000));
    }
    expect(names.size).toBe(14);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Người hái chè giữa những luống chè trên đồi',
    );
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows the banner without playback controls', () => {
    render(<HomeBannerSlideshow />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps the banner still when reduced motion is requested', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { container } = render(<HomeBannerSlideshow />);
    await act(async () => {
      loadNextScene(container);
    });
    act(() => vi.advanceTimersByTime(12000));
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Người hái chè giữa những luống chè trên đồi',
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('retains the current image when the next banner fails to load', () => {
    vi.useFakeTimers();
    const { container } = render(<HomeBannerSlideshow />);
    fireEvent.error(container.querySelector('img[data-banner-next]') as Element);
    act(() => vi.advanceTimersByTime(12000));
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Người hái chè giữa những luống chè trên đồi',
    );
  });

  it('stops advancing in a hidden tab and resumes when visible', async () => {
    vi.useFakeTimers();
    const { container } = render(<HomeBannerSlideshow />);
    await act(async () => {
      loadNextScene(container);
    });
    const visibility = vi.spyOn(document, 'hidden', 'get');
    visibility.mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    act(() => vi.advanceTimersByTime(12000));
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Người hái chè giữa những luống chè trên đồi',
    );
    visibility.mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Bàn tay chạm vào bông lúa trên cánh đồng',
    );
    visibility.mockRestore();
  });
});

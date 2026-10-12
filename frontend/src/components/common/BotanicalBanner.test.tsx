import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { gsap } from 'gsap';
import { afterEach, assert, beforeEach, describe, expect, it, vi } from 'vitest';
import { BotanicalBanner } from './BotanicalBanner';
import { BOTANICAL_BANNERS } from '@/data/bannerData';

// Keep these playback tests independent of Next's browser-only image layout checks.
vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    alt,
    ...props
  }: ComponentProps<'img'> & { fill?: boolean; priority?: boolean }) => (
    // biome-ignore lint/performance/noImgElement: This test double bypasses Next image layout, not image loading in the application.
    <img alt={alt} {...props} />
  ),
}));

// Test the playback policy; GSAP interpolation and visual layout require a browser.
describe('BotanicalBanner playback', () => {
  let conditions: { motionAllowed: boolean; desktop: boolean };
  let mediaCallback: (context: { conditions: typeof conditions }) => (() => void) | undefined;
  let mediaCleanup: (() => void) | undefined;
  let intersectionCallback: IntersectionObserverCallback;
  let documentHidden: boolean;
  let pauseSpies: ReturnType<typeof vi.fn>[];
  let disconnect: ReturnType<typeof vi.fn>;
  let revert: ReturnType<typeof vi.fn>;
  let fadePaused: boolean;
  let fadePause: ReturnType<typeof vi.fn>;
  let completeFade: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    conditions = { motionAllowed: true, desktop: true };
    mediaCleanup = undefined;
    documentHidden = false;
    pauseSpies = [];
    disconnect = vi.fn();
    completeFade = undefined;
    revert = vi.fn(() => mediaCleanup?.());
    vi.stubGlobal('matchMedia', vi.fn());
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => documentHidden);
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1448);
    const originalGetComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      const style = document.createElement('div').style;
      style.cssText = originalGetComputedStyle(element).cssText;
      style.setProperty('--banner-photo-scale', '1.03');
      style.setProperty('--banner-photo-duration', '12');
      style.setProperty('--banner-cycle-duration', '6.5');
      style.setProperty('--banner-fade-duration', '0.65');
      style.setProperty('--banner-drift-distance', '20');
      style.setProperty('--banner-drift-rotation', '5');
      style.setProperty('--banner-drift-duration', '6');
      style.setProperty('--banner-sway-rotation', '3');
      style.setProperty('--banner-sway-duration', '7');
      return style;
    });
    vi.spyOn(gsap, 'to').mockImplementation((_target, vars) => {
      if (vars.opacity === 1) {
        fadePaused = true;
        fadePause = vi.fn((paused: boolean) => {
          fadePaused = paused;
        });
        completeFade = () => {
          if (!fadePaused) vars.onComplete?.();
        };
        return { paused: fadePause } as unknown as gsap.core.Tween;
      }
      const paused = vi.fn();
      pauseSpies.push(paused);
      return { paused } as unknown as gsap.core.Tween;
    });
    vi.spyOn(gsap, 'matchMedia').mockReturnValue({
      add: vi.fn((_queries, callback) => {
        mediaCallback = callback;
        mediaCleanup = callback({ conditions });
      }),
      revert,
    } as unknown as gsap.MatchMedia);
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersectionCallback = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const renderBanner = () =>
    render(
      <BotanicalBanner caption="Ảnh minh họa khung cảnh đồng ruộng.">
        <h1>Hiểu từng chiếc lá.</h1>
      </BotanicalBanner>,
    );
  const setVisible = (isIntersecting: boolean) =>
    act(() => {
      intersectionCallback(
        [{ isIntersecting } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
  const advance = (milliseconds = 6500) =>
    act(() => {
      vi.advanceTimersByTime(milliseconds);
      completeFade?.();
    });
  const expectScene = (index: number) => {
    const banner = BOTANICAL_BANNERS[index];
    expect(screen.getByRole('img', { name: banner.imageAlt })).toHaveAttribute(
      'src',
      banner.imageSrc,
    );
  };

  it('keeps the real rice photograph accessible and hides decorative leaf artwork', () => {
    const { container } = renderBanner();
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(decodeURI(screen.getByRole('img').getAttribute('src') ?? '')).toContain(
      'lúa banner.jpg',
    );
    const leaves = container.querySelectorAll('[data-banner-leaf]');
    expect(leaves).toHaveLength(3);
    leaves.forEach((leaf) => {
      expect(leaf.closest('[aria-hidden="true"]')).not.toBeNull();
    });
    expect(
      container.querySelector('[data-banner-scene="active"] [data-banner-foliage] img'),
    ).toHaveAttribute('src', expect.stringContaining('rice-stalk-cutout.png'));
    expect(container.querySelectorAll('img')).toHaveLength(7);
    setVisible(true);
    pauseSpies.forEach((paused) => {
      expect(paused).toHaveBeenLastCalledWith(false);
    });
  });

  it('keeps copy and caption separate from the photographs', () => {
    const { container } = renderBanner();
    const heading = screen.getByRole('heading', { name: 'Hiểu từng chiếc lá.' });
    expect(heading.closest('.botanical-banner-content')).not.toBeNull();
    expect(container.querySelector('[data-banner-media]')).not.toContainElement(heading);
    expect(
      screen.getByText('Ảnh minh họa khung cảnh đồng ruộng.').closest('.botanical-banner-content'),
    ).not.toBeNull();
    expect(container.querySelectorAll('[data-banner-leaf] img')).toHaveLength(3);
    expect(container.querySelector('[data-banner-leaf] svg')).toBeNull();
  });

  it('animates only two leaves on mobile alongside the photograph', () => {
    conditions.desktop = false;
    renderBanner();
    expect(gsap.to).toHaveBeenCalledTimes(5);
  });

  it('renders a static photograph without creating tweens for reduced motion', () => {
    conditions.motionAllowed = false;
    renderBanner();
    expect(gsap.to).not.toHaveBeenCalled();
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    advance(65000);
    expectScene(0);
  });

  it('pauses offscreen and in hidden tabs, then resumes automatically', () => {
    renderBanner();
    setVisible(true);
    setVisible(false);
    pauseSpies.forEach((paused) => {
      expect(paused).toHaveBeenLastCalledWith(true);
    });
    advance(65000);
    expectScene(0);
    setVisible(true);
    documentHidden = true;
    fireEvent(document, new Event('visibilitychange'));
    pauseSpies.forEach((paused) => {
      expect(paused).toHaveBeenLastCalledWith(true);
    });
    advance(65000);
    expectScene(0);
    documentHidden = false;
    fireEvent(document, new Event('visibilitychange'));
    pauseSpies.forEach((paused) => {
      expect(paused).toHaveBeenLastCalledWith(false);
    });
    advance();
    expectScene(1);
  });

  it('cleans up observers when the motion preference changes', () => {
    renderBanner();
    setVisible(true);
    act(() => {
      mediaCleanup?.();
      conditions.motionAllowed = false;
      mediaCleanup = mediaCallback({ conditions });
    });
    expect(disconnect).toHaveBeenCalledOnce();
    expect(gsap.to).toHaveBeenCalledTimes(6);
    advance(65000);
    expectScene(0);
  });

  it('reverts the media context and removes visibility listeners on unmount', () => {
    const removeListener = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderBanner();
    setVisible(true);
    unmount();
    expect(revert).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(removeListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    advance(65000);
    expect(gsap.to).toHaveBeenCalledTimes(6);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('automatically cycles all fourteen supplied photographs and wraps back to rice', () => {
    const { container } = renderBanner();
    for (const banner of BOTANICAL_BANNERS) {
      expect(screen.getByRole('img', { name: banner.imageAlt })).toHaveAttribute(
        'src',
        banner.imageSrc,
      );
      expect(
        container.querySelectorAll('[data-banner-scene="active"] [data-banner-leaf]'),
      ).toHaveLength(banner.id === 'rice' ? 3 : 0);
      const foliage = container.querySelectorAll<HTMLImageElement>(
        '[data-banner-scene="active"] [data-banner-foliage] img',
      );
      expect(foliage).toHaveLength(1);
      const frame = foliage[0].closest('.botanical-banner-foliage-frame');
      if (banner.id === 'corn') {
        expect(frame).toHaveClass('botanical-banner-foliage-frame-corn');
      } else {
        expect(frame).not.toHaveClass('botanical-banner-foliage-frame-corn');
      }
      const foliageName =
        banner.id === 'rice' ? 'rice-stalk-cutout.png' : `${banner.id}-foliage-cutout.png`;
      expect(foliage[0].getAttribute('src')).toContain(`/banner-leaves/${foliageName}`);
      const leafName =
        banner.id === 'rice' ? 'rice-leaf-cutout.png' : `${banner.id}-foliage-cutout.png`;
      container
        .querySelectorAll<HTMLImageElement>('[data-banner-scene="active"] [data-banner-leaf] img')
        .forEach((image) => {
          expect(image.getAttribute('src')).toContain(`/banner-leaves/${leafName}`);
        });
      setVisible(true);
      advance();
    }
    expectScene(0);
    expect(revert).toHaveBeenCalledTimes(14);
    expect(disconnect).toHaveBeenCalledTimes(14);
  });

  it('has no selector, navigation, pause button or automatic live announcements', () => {
    renderBanner();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('Cây trong banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Banner trước' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Banner tiếp theo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tạm dừng banner' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tiếp tục banner' })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('sways one anchored plant without translating it across the photograph', () => {
    const { container } = renderBanner();
    const plant = container.querySelector('[data-banner-scene="active"] [data-banner-foliage]');
    assert(plant, 'The rice scene needs its anchored stalk artwork');
    const tween = vi.mocked(gsap.to).mock.calls.find(([target]) => target === plant);
    assert(tween, 'The anchored plant should have a scoped sway tween');
    expect(tween[1]).toMatchObject({ rotation: 3, duration: 7, yoyo: true });
    expect(tween[1]).not.toHaveProperty('x');
    expect(tween[1]).not.toHaveProperty('y');
  });

  it('gently enlarges the photo using shared tokens without rotating or animating layout', () => {
    const { container } = renderBanner();
    expect(gsap.to).toHaveBeenCalledWith(
      container.querySelector('[data-banner-photo]'),
      expect.objectContaining({
        scale: 1.03,
        duration: 12,
        ease: 'sine.inOut',
      }),
    );
    vi.mocked(gsap.to).mock.calls.forEach(([, vars]) => {
      for (const property of ['top', 'left', 'width', 'height'])
        expect(vars).not.toHaveProperty(property);
    });
  });

  it('restarts a full interval after returning to the tab without skipping scenes', () => {
    renderBanner();
    setVisible(true);
    advance(3000);
    documentHidden = true;
    fireEvent(document, new Event('visibilitychange'));
    advance(65000);
    documentHidden = false;
    fireEvent(document, new Event('visibilitychange'));
    advance(6499);
    expectScene(0);
    advance(1);
    expectScene(1);
  });

  it('does not duplicate timers when visibility notifications repeat', () => {
    renderBanner();
    setVisible(true);
    advance(3000);
    setVisible(true);
    fireEvent(document, new Event('visibilitychange'));
    advance(3500);
    expectScene(1);
    expect(revert).toHaveBeenCalledOnce();
  });

  it('resumes autoplay when reduced motion is disabled again', () => {
    renderBanner();
    setVisible(true);
    act(() => {
      mediaCleanup?.();
      conditions.motionAllowed = false;
      mediaCleanup = mediaCallback({ conditions });
    });
    advance(65000);
    expectScene(0);
    act(() => {
      conditions.motionAllowed = true;
      mediaCleanup = mediaCallback({ conditions });
    });
    setVisible(true);
    pauseSpies.slice(-1).forEach((paused) => {
      expect(paused).toHaveBeenLastCalledWith(false);
    });
    advance();
    expectScene(1);
  });

  it('falls back to document visibility when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    renderBanner();
    advance();
    expectScene(1);
    advance();
    expectScene(2);
  });

  it('stays static when required timing tokens are unavailable', () => {
    vi.mocked(window.getComputedStyle).mockReturnValue(document.createElement('div').style);
    renderBanner();
    advance(65000);
    expectScene(0);
    expect(gsap.to).not.toHaveBeenCalled();
  });

  it('prepares only the next scene and keeps it out of the accessibility tree', () => {
    const { container } = renderBanner();
    expect(container.querySelectorAll('[data-banner-scene]')).toHaveLength(2);
    const nextScene = container.querySelector('[data-banner-scene="next"]');
    expect(nextScene).toHaveAttribute('aria-hidden', 'true');
    expect(nextScene).toHaveClass('opacity-0', 'motion-reduce:hidden');
    nextScene?.querySelectorAll('img').forEach((image) => {
      expect(image).toHaveAttribute('fetchpriority', 'low');
    });
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('waits for all incoming images before fading, then reuses the prepared scene', () => {
    const { container } = renderBanner();
    const nextScene = container.querySelector('[data-banner-scene="next"]');
    assert(nextScene, 'The next scene should be prepared before the transition');
    const photo = nextScene.querySelector<HTMLImageElement>('[data-banner-photo]');
    assert(photo, 'The next scene should contain its photograph');
    const loaded = vi.spyOn(photo, 'complete', 'get').mockReturnValue(false);
    setVisible(true);
    advance();
    expectScene(0);
    expect(fadePause).toHaveBeenLastCalledWith(true);
    loaded.mockReturnValue(true);
    fireEvent.load(photo);
    expect(fadePause).toHaveBeenLastCalledWith(false);
    expectScene(0);
    act(() => completeFade?.());
    expectScene(1);
    expect(container.querySelector('[data-banner-scene="active"]')).toBe(nextScene);
  });

  it('does not fade to a failed image or remove the working photograph', () => {
    const { container } = renderBanner();
    const photo = container.querySelector<HTMLImageElement>(
      '[data-banner-scene="next"] [data-banner-photo]',
    );
    assert(photo, 'The next scene should contain its photograph');
    vi.spyOn(photo, 'naturalWidth', 'get').mockReturnValue(0);
    fireEvent.error(photo);
    setVisible(true);
    advance(65000);
    expectScene(0);
    expect(fadePause).toHaveBeenLastCalledWith(true);
  });

  it('waits for incoming decorative leaves before changing the crop scene', () => {
    const { container } = renderBanner();
    const leaf = container.querySelector<HTMLImageElement>(
      '[data-banner-scene="next"] [data-banner-foliage] img',
    );
    assert(leaf, 'Incoming crop should prepare its decorative leaf image');
    let loaded = false;
    Object.defineProperty(leaf, 'complete', { configurable: true, get: () => loaded });
    setVisible(true);
    advance();
    expectScene(0);
    loaded = true;
    fireEvent.load(leaf);
    act(() => completeFade?.());
    expectScene(1);
  });

  it('still changes scenes when an optional decorative leaf fails to load', () => {
    const { container } = renderBanner();
    const leaf = container.querySelector<HTMLImageElement>(
      '[data-banner-scene="next"] [data-banner-foliage] img',
    );
    assert(leaf, 'Incoming crop should prepare its decorative leaf image');
    Object.defineProperty(leaf, 'naturalWidth', { configurable: true, get: () => 0 });
    fireEvent.error(leaf);
    setVisible(true);
    advance();
    expectScene(1);
    expect(leaf).not.toBeVisible();
  });

  it('pauses an in-progress fade in a hidden tab and resumes the same scene', () => {
    renderBanner();
    setVisible(true);
    act(() => vi.advanceTimersByTime(6500));
    expect(fadePause).toHaveBeenLastCalledWith(false);
    documentHidden = true;
    fireEvent(document, new Event('visibilitychange'));
    expect(fadePause).toHaveBeenLastCalledWith(true);
    advance(65000);
    expectScene(0);
    documentHidden = false;
    fireEvent(document, new Event('visibilitychange'));
    act(() => completeFade?.());
    expectScene(1);
  });

  it('cleans up image listeners and ignores stale fade completion after unmount', () => {
    const { container, unmount } = renderBanner();
    const photo = container.querySelector<HTMLImageElement>(
      '[data-banner-scene="next"] [data-banner-photo]',
    );
    assert(photo, 'The next scene should contain its photograph');
    const removeListener = vi.spyOn(photo, 'removeEventListener');
    setVisible(true);
    act(() => vi.advanceTimersByTime(6500));
    unmount();
    expect(removeListener).toHaveBeenCalledWith('load', expect.any(Function));
    act(() => completeFade?.());
    expect(vi.getTimerCount()).toBe(0);
  });
});

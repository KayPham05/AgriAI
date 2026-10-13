'use client';

import { useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { BOTANICAL_BANNERS } from '@/data/bannerData';
import { BANNER_FOLIAGE, RICE_LEAF } from '@/data/bannerLeaves';

gsap.registerPlugin(useGSAP);

interface BotanicalBannerProps {
  children: ReactNode;
  caption: string;
}

function BotanicalScene({
  banner,
  active,
}: {
  banner: (typeof BOTANICAL_BANNERS)[number];
  active: boolean;
}) {
  return (
    <div
      data-banner-scene={active ? 'active' : 'next'}
      aria-hidden={active ? undefined : true}
      className={`pointer-events-none absolute inset-0 ${active ? 'opacity-100' : 'opacity-0 motion-reduce:hidden'}`}
    >
      <div className="absolute inset-0">
        <Image
          data-banner-photo
          src={banner.imageSrc}
          alt={banner.imageAlt}
          fill
          priority={active && banner.id === 'rice'}
          loading={active && banner.id === 'rice' ? undefined : 'eager'}
          fetchPriority={active ? 'auto' : 'low'}
          sizes="(min-width: 1376px) 768px, (min-width: 1024px) calc(60vw - 57.6px), 100vw"
          className="botanical-banner-photo object-cover"
          style={{ objectPosition: banner.photoPosition, transformOrigin: 'center' }}
        />
      </div>
      <div
        data-banner-decoration
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div
          className={`botanical-banner-foliage-frame${banner.id === 'corn' ? ' botanical-banner-foliage-frame-corn' : ''}`}
        >
          <div data-banner-foliage className="botanical-banner-foliage">
            <Image
              src={BANNER_FOLIAGE[banner.id]}
              alt=""
              fill
              loading="eager"
              fetchPriority="low"
              sizes="(min-width: 1024px) 576px, 90vw"
              className="object-contain"
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          </div>
        </div>
        {banner.id === 'rice' &&
          ['start', 'end', 'top'].map((position) => (
            <div
              key={position}
              className={`botanical-banner-leaf botanical-banner-leaf-${position}`}
            >
              <div data-banner-leaf className="relative size-full">
                <Image
                  src={RICE_LEAF}
                  alt=""
                  fill
                  loading="eager"
                  fetchPriority="low"
                  sizes="90px"
                  className="object-contain"
                  onError={(event) => {
                    event.currentTarget.hidden = true;
                  }}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export function BotanicalBanner({ children, caption }: BotanicalBannerProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeBanner = BOTANICAL_BANNERS[activeIndex];
  const nextBanner = BOTANICAL_BANNERS[(activeIndex + 1) % BOTANICAL_BANNERS.length];

  useGSAP(
    () => {
      if (!rootRef.current || typeof window.matchMedia !== 'function') return;
      const media = gsap.matchMedia();

      media.add(
        {
          motionAllowed: '(prefers-reduced-motion: no-preference)',
          desktop: '(min-width: 768px)',
        },
        (context) => {
          if (!context.conditions?.motionAllowed || !rootRef.current) return;
          const root = rootRef.current;
          const tokens = getComputedStyle(root);
          const scale = parseFloat(tokens.getPropertyValue('--banner-photo-scale'));
          const duration = parseFloat(tokens.getPropertyValue('--banner-photo-duration'));
          const cycleDuration = parseFloat(tokens.getPropertyValue('--banner-cycle-duration'));
          const fadeDuration = parseFloat(tokens.getPropertyValue('--banner-fade-duration'));
          if (
            ![scale, duration, cycleDuration, fadeDuration].every(
              (value) => Number.isFinite(value) && value > 0,
            )
          )
            return;

          const activeScene = root.querySelector<HTMLElement>('[data-banner-scene="active"]');
          const nextScene = root.querySelector<HTMLElement>('[data-banner-scene="next"]');
          if (!activeScene || !nextScene) return;
          const nextImages = Array.from(nextScene.querySelectorAll<HTMLImageElement>('img'));
          const tweens = [
            gsap.to(activeScene.querySelector('[data-banner-photo]'), {
              scale,
              duration,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
              paused: true,
            }),
          ];
          const swayRotation = parseFloat(tokens.getPropertyValue('--banner-sway-rotation'));
          const swayDuration = parseFloat(tokens.getPropertyValue('--banner-sway-duration'));
          if ([swayRotation, swayDuration].every((value) => Number.isFinite(value) && value > 0)) {
            tweens.push(
              gsap.to(activeScene.querySelector('[data-banner-foliage]'), {
                rotation: swayRotation,
                duration: swayDuration,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                paused: true,
              }),
            );
          }
          const driftDistance = parseFloat(tokens.getPropertyValue('--banner-drift-distance'));
          const driftRotation = parseFloat(tokens.getPropertyValue('--banner-drift-rotation'));
          const driftDuration = parseFloat(tokens.getPropertyValue('--banner-drift-duration'));
          if (
            [driftDistance, driftRotation, driftDuration].every(
              (value) => Number.isFinite(value) && value > 0,
            )
          ) {
            activeScene.querySelectorAll('[data-banner-leaf]').forEach((leaf, index) => {
              if (!context.conditions?.desktop && index > 1) return;
              const direction = index % 2 === 0 ? 1 : -1;
              tweens.push(
                gsap.to(leaf, {
                  x: direction * driftDistance,
                  y: -driftDistance,
                  rotation: direction * driftRotation,
                  duration: driftDuration,
                  repeat: -1,
                  yoyo: true,
                  ease: 'sine.inOut',
                  paused: true,
                }),
              );
            });
          }

          let isVisible = typeof IntersectionObserver !== 'function';
          let isDue = false;
          let isTransitioning = false;
          let disposed = false;
          let cycleTimer: number | undefined;
          // Created inside the media context so pause, reduced motion and unmount also stop the fade.
          const fade = gsap.to(nextScene, {
            opacity: 1,
            duration: fadeDuration,
            ease: 'sine.inOut',
            paused: true,
            onComplete: () => {
              if (!disposed) setActiveIndex((index) => (index + 1) % BOTANICAL_BANNERS.length);
            },
          });
          const stopCycle = () => {
            window.clearTimeout(cycleTimer);
            cycleTimer = undefined;
          };
          const syncPlayback = () => {
            const paused = !isVisible || document.hidden;
            tweens.forEach((tween) => {
              tween.paused(paused);
            });
            fade.paused(paused || !isTransitioning);
            if (paused) {
              stopCycle();
              isDue = false;
            } else if (isTransitioning) {
              return;
            } else if (isDue) {
              // Leave the current photograph intact on slow connections or image errors.
              if (
                nextImages.every(
                  (image) =>
                    (image.complete && image.naturalWidth > 0) ||
                    (image.hidden && image.closest('[data-banner-decoration]')),
                )
              ) {
                isTransitioning = true;
                fade.paused(false);
              }
            } else if (cycleTimer === undefined) {
              cycleTimer = window.setTimeout(() => {
                cycleTimer = undefined;
                isDue = true;
                syncPlayback();
              }, cycleDuration * 1000);
            }
          };
          const handleImageError = (event: Event) => {
            const image = event.currentTarget as HTMLImageElement;
            if (image.closest('[data-banner-decoration]')) image.hidden = true;
            syncPlayback();
          };
          const observer =
            typeof IntersectionObserver === 'function'
              ? new IntersectionObserver(
                  ([entry]) => {
                    isVisible = entry.isIntersecting;
                    syncPlayback();
                  },
                  { threshold: 0 },
                )
              : null;

          observer?.observe(root);
          document.addEventListener('visibilitychange', syncPlayback);
          nextImages.forEach((image) => {
            image.addEventListener('load', syncPlayback);
            image.addEventListener('error', handleImageError);
          });
          syncPlayback();

          return () => {
            disposed = true;
            stopCycle();
            observer?.disconnect();
            document.removeEventListener('visibilitychange', syncPlayback);
            nextImages.forEach((image) => {
              image.removeEventListener('load', syncPlayback);
              image.removeEventListener('error', handleImageError);
            });
          };
        },
        rootRef,
      );

      return () => media.revert();
    },
    { scope: rootRef, dependencies: [activeBanner.id], revertOnUpdate: true },
  );

  return (
    <section ref={rootRef} aria-label="Banner AgriAI" className="bg-background lg:px-12">
      <div className="botanical-banner-stage relative isolate mx-auto overflow-hidden lg:max-w-7xl">
        <div className="botanical-banner-content relative z-10 mx-auto flex w-full max-w-7xl items-center px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
          <div className="w-full max-w-lg lg:w-1/2 lg:pr-8">
            {children}
            <p className="mt-6 max-w-md text-xs leading-5 text-muted-foreground">{caption}</p>
          </div>
        </div>

        <div
          data-banner-media
          className="botanical-banner-media relative overflow-hidden lg:absolute lg:inset-y-0 lg:right-0"
        >
          <BotanicalScene key={activeBanner.id} banner={activeBanner} active />
          <BotanicalScene key={nextBanner.id} banner={nextBanner} active={false} />
        </div>
      </div>
    </section>
  );
}

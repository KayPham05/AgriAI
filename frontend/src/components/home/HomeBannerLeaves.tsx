'use client';

import { useEffect, useRef, type SyntheticEvent } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { BANNER_FOLIAGE, RICE_LEAF } from '@/data/bannerLeaves';

gsap.registerPlugin(useGSAP);

export function HomeBannerLeaves({
  plantId,
  active = true,
  onReady,
}: {
  plantId: string;
  active?: boolean;
  onReady?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const syncRef = useRef<(() => void) | null>(null);
  const loadedImages = useRef(new Set<HTMLImageElement>());
  const markReady = (event: SyntheticEvent<HTMLImageElement>) => {
    loadedImages.current.add(event.currentTarget);
    if (loadedImages.current.size === (plantId === 'rice' ? 3 : 1)) onReady?.();
  };
  useEffect(() => {
    activeRef.current = active;
    syncRef.current?.();
  }, [active]);
  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || typeof window.matchMedia !== 'function') return;
      const tokens = getComputedStyle(root);
      const distance = parseFloat(tokens.getPropertyValue('--banner-drift-distance'));
      const rotation = parseFloat(tokens.getPropertyValue('--banner-sway-rotation'));
      const duration = parseFloat(tokens.getPropertyValue('--banner-sway-duration'));
      if (![distance, rotation, duration].every(Number.isFinite)) return;
      const media = gsap.matchMedia();
      media.add(
        '(prefers-reduced-motion: no-preference)',
        () => {
          let visible = false;
          const tween = gsap.fromTo(
            root.querySelectorAll('[data-home-leaf-motion]'),
            { rotation: -rotation },
            {
              rotation,
              y: -distance,
              duration,
              stagger: duration / 3,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
              paused: true,
            },
          );
          const syncPlayback = () =>
            tween.paused(!activeRef.current || !visible || document.hidden);
          syncRef.current = syncPlayback;
          const observer =
            typeof IntersectionObserver === 'function'
              ? new IntersectionObserver(([entry]) => {
                  visible = entry.isIntersecting;
                  syncPlayback();
                })
              : null;
          observer?.observe(root);
          document.addEventListener('visibilitychange', syncPlayback);
          return () => {
            syncRef.current = null;
            observer?.disconnect();
            document.removeEventListener('visibilitychange', syncPlayback);
          };
        },
        root,
      );
      return () => media.revert();
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      data-home-banner-leaves={plantId}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      <div
        className={`absolute -right-6 top-1/2 w-40 max-w-[45%] -translate-y-1/2 md:-right-8 md:top-auto md:-bottom-8 md:w-80 md:translate-y-0 lg:w-96 xl:w-112 ${plantId === 'corn' ? 'scale-75 origin-bottom-right' : ''}`}
      >
        <div data-home-leaf-motion className="relative aspect-[4/3] origin-bottom-right">
          <Image
            src={BANNER_FOLIAGE[plantId]}
            alt=""
            fill
            sizes="(min-width: 1280px) 448px, (min-width: 768px) 320px, 160px"
            className="object-contain"
            loading="eager"
            onLoad={markReady}
            onError={(event) => {
              event.currentTarget.hidden = true;
              markReady(event);
            }}
          />
        </div>
      </div>
      {plantId === 'rice' &&
        [
          'absolute left-4 top-1/2 w-12 -rotate-30 md:left-12 md:w-20',
          'absolute right-8 top-1/2 hidden w-16 rotate-30 md:block',
        ].map((className) => (
          <div key={className} className={className}>
            <div data-home-leaf-motion className="relative aspect-square">
              <Image
                src={RICE_LEAF}
                alt=""
                fill
                sizes="80px"
                className="object-contain"
                loading="eager"
                onLoad={markReady}
                onError={(event) => {
                  event.currentTarget.hidden = true;
                  markReady(event);
                }}
              />
            </div>
          </div>
        ))}
    </div>
  );
}

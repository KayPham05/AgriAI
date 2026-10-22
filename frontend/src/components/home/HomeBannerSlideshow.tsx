'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { CROP_PHOTOS } from '@/data/cropPhotos';
import { HomeBannerLeaves } from '@/components/home/HomeBannerLeaves';

const banners = [
  { ...CROP_PHOTOS.tea, plantId: 'tea' },
  ...Object.entries(CROP_PHOTOS)
    .filter(([key]) => key !== 'tea')
    .map(([plantId, photo]) => ({ ...photo, plantId })),
];

export function HomeBannerSlideshow() {
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [ready, setReady] = useState<number | null>(null);
  const [foliageReady, setFoliageReady] = useState<number | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hidden, setHidden] = useState(false);
  const next = (active + 1) % banners.length;

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const syncMotion = () => {
      setReducedMotion(media?.matches ?? false);
      if (media?.matches) setPrevious(null);
    };
    const syncVisibility = () => setHidden(document.hidden);
    syncMotion();
    syncVisibility();
    media?.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    return () => {
      media?.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (loadFailed || reducedMotion || hidden || ready !== next || foliageReady !== next) return;
    const timer = window.setTimeout(() => {
      setPrevious(active);
      setActive(next);
      setReady(null);
      setFoliageReady(null);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [active, next, ready, foliageReady, loadFailed, reducedMotion, hidden]);

  return (
    <>
      {banners.map((photo, index) => {
        if (index !== active && index !== previous && index !== next) return null;
        const isActive = index === active;
        const isNext = index === next;
        return (
          <div
            key={photo.plantId}
            data-home-banner-scene={isActive ? 'active' : isNext ? 'next' : 'previous'}
            aria-hidden={!isActive}
            className={`pointer-events-none absolute inset-0 isolate ${isActive ? 'z-10 animate-in fade-in duration-1000 motion-reduce:animate-none' : 'z-0'}`}
            style={{ opacity: isNext ? 0 : 1 }}
            onAnimationEnd={(event) => {
              if (isActive && event.target === event.currentTarget) setPrevious(null);
            }}
          >
            <Image
              src={photo.imageSrc}
              alt={isActive ? photo.imageAlt : ''}
              aria-hidden={!isActive}
              data-banner-next={isNext ? '' : undefined}
              fill
              priority={index === 0}
              loading={index === 0 ? undefined : 'eager'}
              sizes="100vw"
              className="object-cover"
              style={{
                objectPosition: index === 0 ? '50% 58%' : photo.photoPosition,
              }}
              onLoad={() => {
                if (isNext) setReady(index);
              }}
              onError={() => {
                if (isNext) setLoadFailed(true);
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20 bg-linear-to-b from-background via-background/90 via-30% to-transparent to-75%"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1/2 bg-linear-to-t from-foreground/75 to-transparent"
            />
            <HomeBannerLeaves
              plantId={photo.plantId}
              active={isActive}
              onReady={() => {
                if (isNext) setFoliageReady(index);
              }}
            />
          </div>
        );
      })}
    </>
  );
}

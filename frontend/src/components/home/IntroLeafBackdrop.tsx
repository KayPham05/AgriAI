'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import leaf from '@/assets/banner-leaves/rice-leaf-cutout.png';

gsap.registerPlugin(useGSAP);

const sectionLeaves = [
  'absolute -bottom-28 -left-32 size-80 -rotate-45 md:-bottom-36 md:-left-40 md:size-112',
  'absolute -bottom-32 -left-12 size-80 -rotate-12 md:-bottom-40 md:-left-20 md:size-112',
  'absolute -bottom-28 -left-44 size-80 -rotate-75 md:-bottom-36 md:-left-56 md:size-112',
  'absolute -top-36 -right-44 hidden size-112 rotate-135 md:block',
  'absolute -top-48 -right-24 hidden size-112 rotate-165 md:block',
];

const heroLeaves = [
  'absolute left-0 top-12 size-20 -rotate-30 md:left-8 md:top-24 md:size-28',
  'absolute -right-8 top-1/3 size-24 rotate-45 md:right-8 md:size-32',
  'absolute bottom-8 left-8 size-24 -rotate-60 md:bottom-16 md:left-40 md:size-32',
  'absolute bottom-16 right-0 hidden size-28 rotate-30 md:block md:right-40',
];

export function IntroLeafBackdrop({ variant = 'section' }: { variant?: 'section' | 'hero' }) {
  const leaves = variant === 'hero' ? heroLeaves : sectionLeaves;
  const rootRef = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const root = rootRef.current;
      if (
        !root ||
        typeof window.matchMedia !== 'function' ||
        typeof IntersectionObserver !== 'function'
      )
        return;
      const tokens = getComputedStyle(root);
      const distance =
        parseFloat(tokens.getPropertyValue('--banner-drift-distance')) *
        (variant === 'hero' ? 1 : 3);
      const rotation =
        parseFloat(tokens.getPropertyValue('--banner-drift-rotation')) *
        (variant === 'hero' ? 1 : 3);
      const duration =
        parseFloat(tokens.getPropertyValue('--banner-drift-duration')) *
        (variant === 'hero' ? 1 : 0.45);
      if (![distance, rotation, duration].every(Number.isFinite)) return;
      const media = gsap.matchMedia();
      media.add(
        '(prefers-reduced-motion: no-preference)',
        () => {
          let visible = false;
          const tween = gsap.to('[data-intro-leaf-motion]', {
            x: (index) => (index % 2 ? -distance : distance),
            y: (index) => (index % 2 ? distance : -distance),
            rotation: (index) => (index % 2 ? -rotation : rotation),
            duration,
            stagger: duration / leaves.length,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            paused: true,
          });
          const syncPlayback = () => tween.paused(!visible || document.hidden);
          const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            syncPlayback();
          });
          observer.observe(root);
          document.addEventListener('visibilitychange', syncPlayback);
          return () => {
            observer.disconnect();
            document.removeEventListener('visibilitychange', syncPlayback);
          };
        },
        root,
      );
      return () => media.revert();
    },
    { scope: rootRef, dependencies: [variant], revertOnUpdate: true },
  );

  return (
    <div
      ref={rootRef}
      data-intro-leaves={variant}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-10"
    >
      {variant === 'hero' && (
        <div className="absolute inset-0 opacity-50">
          <div className="absolute -left-72 -top-24 size-96 -rotate-45 md:-left-96 md:-top-40 md:size-160">
            <Image
              src={leaf}
              alt=""
              fill
              sizes="(min-width: 768px) 640px, 384px"
              className="object-contain"
            />
          </div>
          <div className="absolute -bottom-32 -right-72 size-96 rotate-135 md:-bottom-48 md:-right-80 md:size-160">
            <Image
              src={leaf}
              alt=""
              fill
              sizes="(min-width: 768px) 640px, 384px"
              className="object-contain"
            />
          </div>
        </div>
      )}
      {leaves.map((className, index) => (
        <div key={className} data-intro-leaf className={className}>
          <div data-intro-leaf-motion className="relative size-full">
            <Image
              src={leaf}
              alt=""
              fill
              sizes={
                variant === 'hero'
                  ? '128px'
                  : index < 3
                    ? '(min-width: 768px) 448px, 320px'
                    : '448px'
              }
              className="object-contain"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

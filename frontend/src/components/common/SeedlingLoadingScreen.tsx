'use client';

import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const RECOVERY_DELAY_MS = 20000;
gsap.registerPlugin(useGSAP);

interface SeedlingLoadingScreenProps {
  userName?: string;
  mode?: 'loading' | 'logout';
  error?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  variant?: 'fullscreen' | 'section';
}

export function SeedlingLoadingScreen({
  userName,
  mode = 'loading',
  error,
  onRetry,
  onCancel,
  variant = 'fullscreen',
}: SeedlingLoadingScreenProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [stalled, setStalled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [paused, setPaused] = useState(false);
  const failure = error || (stalled ? 'Kết nối đang lâu hơn dự kiến. Vui lòng thử lại.' : '');
  const name = userName?.trim();
  const salutation = mode === 'logout' ? 'Tạm biệt' : 'Xin chào';
  const greeting = name ? `${salutation}, ${name}.` : `${salutation}.`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: An explicit retry resets the recovery window.
  useEffect(() => {
    if (error || mode === 'logout') return;
    const timer = window.setTimeout(() => setStalled(true), RECOVERY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [error, attempt, mode]);

  useEffect(() => {
    const sync = () => setPaused(document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || !window.matchMedia || paused || failure) return;
      const media = gsap.matchMedia();
      media.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          reduced: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const fill = root.querySelector('[data-seed-progress]');
          if (context.conditions?.reduced) {
            if (fill) gsap.set(fill, { scaleX: 0.6 });
            return;
          }
          root.querySelectorAll('[data-seed-ripple]').forEach((ring, index) => {
            gsap.fromTo(
              ring,
              { scale: 1, opacity: 0.5 },
              {
                scale: 1.5,
                opacity: 0,
                duration: 2.4,
                delay: index * 1.2,
                repeat: -1,
                ease: 'sine.out',
                immediateRender: index === 0,
              },
            );
          });
          if (fill)
            gsap
              .timeline({ repeat: -1 })
              .fromTo(
                fill,
                { scaleX: 0.06, opacity: 1 },
                { scaleX: 0.92, duration: 2, ease: 'power1.inOut' },
              )
              .to(fill, { opacity: 0, duration: 0.3 });
        },
        root,
      );
      return () => media.revert();
    },
    { scope: rootRef, dependencies: [paused, failure, mode], revertOnUpdate: true },
  );

  const retry = () => {
    setStalled(false);
    setAttempt((current) => current + 1);
    if (onRetry) onRetry();
    else window.location.reload();
  };

  return (
    <section
      ref={rootRef}
      className={`seed-loading seed-loading-${variant}`}
      style={{ background: 'var(--background)' }}
      role="status"
      aria-label={mode === 'logout' ? 'Đã đăng xuất AgriAI' : 'Đang tải AgriAI'}
      aria-busy={mode === 'loading' && !failure}
      data-paused={paused || Boolean(failure)}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center sm:gap-10 [@media(max-height:500px)]:gap-4">
        <div className="flex items-center justify-center gap-2 text-3xl font-extrabold tracking-tight text-primary [@media(max-height:500px)]:text-2xl">
          <Image
            src="/images/agriai-leaf-mark.png"
            alt="AgriAI"
            width={72}
            height={72}
            className="h-14 w-10 shrink-0 object-contain [@media(max-height:500px)]:h-10 [@media(max-height:500px)]:w-8"
            priority
          />
          <p aria-hidden="true">
            Agri<span className="text-ring">AI</span>
          </p>
        </div>
        <div
          className="relative grid size-40 place-items-center rounded-full bg-secondary/60 sm:size-44 [@media(max-height:500px)]:size-28"
          aria-hidden="true"
        >
          <span
            data-seed-ripple
            className="pointer-events-none absolute inset-0 rounded-full border border-accent/40 opacity-0"
          />
          <span
            data-seed-ripple
            className="pointer-events-none absolute inset-0 rounded-full border border-accent/40 opacity-0"
          />
          <svg
            viewBox="24 8 112 136"
            className="block h-28 w-24 sm:h-32 sm:w-28 [@media(max-height:500px)]:h-20 [@media(max-height:500px)]:w-16"
            aria-hidden="true"
          >
            <g transform="translate(80 122)">
              <g className="seed-loading-stalk">
                <rect x="-3" y="-81" width="6" height="81" rx="2" className="seed-loading-stem" />
              </g>
              <g className="seed-loading-canopy">
                <path d="M0 0C-20 2-35-10-40-25C-17-30 0-23 0 0Z" className="seed-loading-leaf" />
                <path d="M0 0C20 2 35-10 40-25C17-30 0-23 0 0Z" className="seed-loading-leaf" />
              </g>
            </g>
            <g className="seed-loading-soil">
              <circle cx="57" cy="130" r="2.4" />
              <circle cx="65" cy="122" r="3.5" />
              <circle cx="75" cy="135" r="2.2" />
              <circle cx="88" cy="121" r="2.8" />
              <circle cx="93" cy="133" r="3.4" />
              <circle cx="105" cy="129" r="1.6" />
            </g>
          </svg>
        </div>
        <div className="flex w-full flex-col items-center">
          <h1 aria-label={greeting} className="flex max-w-full flex-col gap-1 wrap-anywhere">
            <span className="text-sm font-medium text-muted-foreground">
              {salutation}
              {name ? ',' : ''}
            </span>
            {name && (
              <span className="text-2xl font-bold leading-tight tracking-tight text-foreground">
                {name}
              </span>
            )}
          </h1>
          {mode === 'loading' && !failure ? (
            <div
              role="progressbar"
              aria-label="Đang tải"
              className="mt-5 h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-secondary"
            >
              <div
                data-seed-progress
                className="h-full origin-left rounded-full bg-ring"
                style={{ transform: 'scaleX(0.06)' }}
              />
            </div>
          ) : null}
          <p className="mt-3 text-xs font-semibold tracking-widest text-ring">
            {failure ? 'TẠM DỪNG' : mode === 'logout' ? 'HẸN GẶP LẠI' : 'ĐANG TẢI'}
          </p>
        </div>
        {failure ? (
          <div className="mt-6 space-y-4">
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={retry}>Thử lại</Button>
              {onCancel ? (
                <Button variant="outline" onClick={onCancel}>
                  Về trang giới thiệu
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(useGSAP);

export interface ReloadLoadingScreenProps {
  error?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

const blocks = ['bg-primary', 'bg-accent', 'bg-ring', 'bg-secondary'];

export function ReloadLoadingScreen({ error, onRetry, onCancel }: ReloadLoadingScreenProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [stalled, setStalled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const failure = error || (stalled ? 'Kết nối đang lâu hơn dự kiến. Vui lòng thử lại.' : '');

  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry starts a new recovery window.
  useEffect(() => {
    if (error) return;
    const timer = window.setTimeout(() => setStalled(true), 20000);
    return () => window.clearTimeout(timer);
  }, [error, attempt]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || !window.matchMedia || failure) return;
      const stage = root.querySelector('[data-reload-stage]');
      const squares = root.querySelectorAll('[data-reload-block]');
      const media = gsap.matchMedia();
      media.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          reduced: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          if (context.conditions?.reduced) return;
          const timeline = gsap.timeline({ repeat: -1, defaults: { ease: 'power2.inOut' } });
          timeline.set(squares, {
            x: (index) => index * 60 - 90,
            scale: (index) => (index % 2 === 0 ? 1 : 0.05),
          });
          for (let step = 1; step <= 4; step++) {
            timeline.to(
              squares,
              {
                x: (index) => ((index + step) % 4) * 60 - 90,
                scale: (index) => ((index + step) % 2 === 0 ? 1 : 0.05),
                duration: 0.6,
              },
              '+=0.12',
            );
          }
          timeline.fromTo(stage, { rotation: 0 }, { rotation: 360, duration: 1.15 });
          const sync = () => timeline.paused(document.hidden);
          sync();
          document.addEventListener('visibilitychange', sync);
          return () => document.removeEventListener('visibilitychange', sync);
        },
        root,
      );
      return () => media.revert();
    },
    { scope: rootRef, dependencies: [failure], revertOnUpdate: true },
  );

  const retry = () => {
    setStalled(false);
    setAttempt((value) => value + 1);
    if (onRetry) onRetry();
    else window.location.reload();
  };

  return (
    <section
      ref={rootRef}
      role="status"
      aria-label="Đang tải AgriAI"
      aria-busy={!failure}
      className="fixed inset-0 z-50 grid min-h-svh place-items-center overflow-y-auto bg-background px-5 py-10"
    >
      <div className="w-full max-w-sm text-center">
        <div data-reload-stage aria-hidden="true" className="relative mx-auto h-48 w-64 max-w-full">
          {blocks.map((color, index) => (
            <span
              key={color}
              data-reload-block
              className={`absolute top-1/2 left-1/2 -mt-5 -ml-5 size-10 rounded-sm ${color}`}
              style={{ transform: `translateX(${index * 60 - 90}px)` }}
            />
          ))}
        </div>
        {failure && (
          <div className="mt-6 space-y-4">
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={retry}>Thử lại</Button>
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Quay lại
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

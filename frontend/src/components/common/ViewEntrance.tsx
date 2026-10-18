'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

gsap.registerPlugin(useGSAP);

export function ViewEntrance({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current || typeof window.matchMedia !== 'function') return;
      const root = rootRef.current;
      const tokens = getComputedStyle(root);
      const distance = parseFloat(tokens.getPropertyValue('--view-enter-distance'));
      const duration = parseFloat(tokens.getPropertyValue('--view-enter-duration'));
      if (!Number.isFinite(distance) || !Number.isFinite(duration)) return;

      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          root,
          { y: distance, opacity: 0 },
          { y: 0, opacity: 1, duration, ease: 'power2.out', clearProps: 'transform,opacity' },
        );
      });
      return () => media.revert();
    },
    { scope: rootRef },
  );

  return <div ref={rootRef}>{children}</div>;
}

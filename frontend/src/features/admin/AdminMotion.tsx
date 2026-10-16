'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

gsap.registerPlugin(useGSAP);

export function AdminMotion({ view, children }: { view: string; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || typeof window.matchMedia !== 'function') return;
      const style = getComputedStyle(root);
      const distance = parseFloat(style.getPropertyValue('--admin-enter-distance'));
      const duration = parseFloat(style.getPropertyValue('--admin-enter-duration'));
      const opacity = Number.parseFloat(style.getPropertyValue('--admin-enter-opacity'));
      const stagger = parseFloat(style.getPropertyValue('--admin-enter-stagger'));
      if (![distance, duration, stagger, opacity].every(Number.isFinite)) return;
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const panels = Array.from(root.querySelectorAll('[data-admin-enter]')).slice(0, 8);
        gsap.fromTo(
          panels.length ? panels : root.children,
          { y: distance, opacity },
          {
            y: 0,
            opacity: 1,
            duration,
            stagger,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
          },
        );
      });
      return () => media.revert();
    },
    { scope: rootRef, dependencies: [view], revertOnUpdate: true },
  );
  return (
    <div ref={rootRef} className="min-w-0">
      {children}
    </div>
  );
}

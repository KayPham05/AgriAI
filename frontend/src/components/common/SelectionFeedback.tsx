'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

gsap.registerPlugin(useGSAP);

interface SelectionFeedbackProps {
  selectionKey: string;
  mode: 'preview' | 'results';
  className?: string;
  children: ReactNode;
}

export function SelectionFeedback({
  selectionKey,
  mode,
  className,
  children,
}: SelectionFeedbackProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previousKeyRef = useRef(selectionKey);

  useGSAP(
    () => {
      const changed = previousKeyRef.current !== selectionKey;
      previousKeyRef.current = selectionKey;
      if (!changed || !rootRef.current || typeof window.matchMedia !== 'function') return;

      const root = rootRef.current;
      const tokens = getComputedStyle(root);
      const distance = parseFloat(tokens.getPropertyValue('--selection-enter-distance'));
      const duration = parseFloat(tokens.getPropertyValue('--selection-enter-duration'));
      const startOpacity = parseFloat(tokens.getPropertyValue('--selection-enter-opacity'));
      const photoScale = parseFloat(tokens.getPropertyValue('--selection-photo-scale'));
      const stagger = parseFloat(tokens.getPropertyValue('--selection-enter-stagger'));
      if (![distance, duration, startOpacity, photoScale, stagger].every(Number.isFinite)) return;

      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        if (mode === 'preview') {
          const photo = root.querySelector('[data-selection-photo]');
          const copy = root.querySelector('[data-selection-copy]');
          if (photo) {
            gsap.fromTo(
              photo,
              { opacity: startOpacity, scale: photoScale },
              {
                opacity: 1,
                scale: 1,
                duration,
                ease: 'power2.out',
                clearProps: 'opacity,transform',
              },
            );
          }
          if (copy) {
            gsap.fromTo(
              copy,
              { opacity: startOpacity, y: distance },
              {
                opacity: 1,
                y: 0,
                duration,
                ease: 'power2.out',
                clearProps: 'opacity,transform',
              },
            );
          }
          return;
        }

        const articles = Array.from(root.querySelectorAll('article')).slice(0, 6);
        const targets = articles.length ? articles : root.firstElementChild;
        if (!targets) return;
        gsap.fromTo(
          targets,
          { opacity: startOpacity, y: distance },
          {
            opacity: 1,
            y: 0,
            duration,
            stagger,
            ease: 'power2.out',
            clearProps: 'opacity,transform',
          },
        );
      });
      return () => media.revert();
    },
    { scope: rootRef, dependencies: [selectionKey], revertOnUpdate: true },
  );

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}

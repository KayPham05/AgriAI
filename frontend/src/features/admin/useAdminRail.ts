'use client';

import { useRef, useState, type FocusEvent, type PointerEvent } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

gsap.registerPlugin(useGSAP);

export function useAdminRail() {
  const rootRef = useRef<HTMLDivElement>(null);
  const previousLeft = useRef<number | null>(null);
  const previousWidth = useRef<number | null>(null);
  const [railOpen, setRailOpen] = useState(false);

  const pointerInside = useRef(false);
  const focusInside = useRef(false);
  const openIntent = useRef(false);
  function setExpanded(open: boolean) {
    if (openIntent.current === open) return;
    openIntent.current = open;
    previousLeft.current =
      rootRef.current?.querySelector('[data-admin-content]')?.getBoundingClientRect().left ?? null;
    previousWidth.current =
      rootRef.current?.querySelector('[data-admin-rail-surface]')?.getBoundingClientRect().width ??
      null;
    setRailOpen(open);
  }

  useGSAP(
    () => {
      const root = rootRef.current;
      const before = previousLeft.current;
      const oldWidth = previousWidth.current;
      previousLeft.current = null;
      previousWidth.current = null;
      if (!root || before === null || typeof window.matchMedia !== 'function') return;
      const content = root.querySelector<HTMLElement>('[data-admin-content]');
      if (!content) return;
      const distance = before - content.getBoundingClientRect().left;
      const rail = root.querySelector<HTMLElement>('.admin-rail');
      const surface = root.querySelector<HTMLElement>('[data-admin-rail-surface]');
      const duration = Number.parseFloat(
        getComputedStyle(root).getPropertyValue('--admin-rail-duration'),
      );
      const labelOffset = Number.parseFloat(
        getComputedStyle(root).getPropertyValue('--admin-rail-label-offset'),
      );
      if (!Number.isFinite(labelOffset) || !Number.isFinite(duration) || Math.abs(distance) < 1)
        return;
      const media = gsap.matchMedia();
      let played = false;
      media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        if (played) return;
        played = true;
        if (rail && surface && oldWidth) {
          gsap.fromTo(
            surface,
            { scaleX: oldWidth / rail.getBoundingClientRect().width },
            {
              scaleX: 1,
              duration,
              ease: 'power3.out',
              clearProps: 'transform',
            },
          );
        }
        if (railOpen) {
          gsap.fromTo(
            root.querySelectorAll('.admin-rail-label:not([hidden])'),
            { x: labelOffset, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration,
              ease: 'power3.out',
              clearProps: 'transform,opacity',
            },
          );
        }
        // Reflow once, then animate the previous visual position with a transform.
        gsap.fromTo(
          content,
          { x: distance },
          {
            x: 0,
            duration,
            ease: 'power3.out',
            clearProps: 'transform',
          },
        );
      });
      return () => media.revert();
    },
    { scope: rootRef, dependencies: [railOpen], revertOnUpdate: true },
  );

  const railHandlers = {
    onPointerEnter(event: PointerEvent<HTMLElement>) {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      pointerInside.current = true;
      setExpanded(true);
    },
    onPointerLeave() {
      pointerInside.current = false;
      setExpanded(focusInside.current);
    },
    onFocusCapture() {
      focusInside.current = true;
      setExpanded(true);
    },
    onBlurCapture(event: FocusEvent<HTMLElement>) {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      focusInside.current = false;
      setExpanded(pointerInside.current);
    },
  };
  return { rootRef, railOpen, railHandlers };
}

'use client';

import { type KeyboardEvent, useId, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { BOTANICAL_BANNERS } from '@/data/bannerData';

gsap.registerPlugin(useGSAP);
const perforations = ['a', 'b', 'c', 'd', 'e'];
const filmCopies = [-1, 0, 1];
const wrapPosition = (left: number, cycle: number) =>
  cycle + ((((left - cycle) % cycle) + cycle) % cycle);
const frameWidth = (viewport: HTMLElement) =>
  viewport.firstElementChild?.getBoundingClientRect().width ||
  viewport.clientWidth / (window.innerWidth >= 768 ? 4 : 2);

function FilmRail() {
  return (
    <div aria-hidden="true" className="crop-film-rail">
      {perforations.map((hole) => (
        <span key={hole} className="crop-film-hole" />
      ))}
    </div>
  );
}

export function CropFilmStrip() {
  const viewportRef = useRef<HTMLElement>(null);
  const hintId = useId();
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const viewport = event.currentTarget;
    const step = frameWidth(viewport);
    const cycle = step * BOTANICAL_BANNERS.length;
    if (!cycle) return;
    const destinations: Record<string, number> = {
      ArrowLeft: viewport.scrollLeft - step,
      ArrowRight: viewport.scrollLeft + step,
      Home: cycle,
      End: cycle * 2 - step,
    };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    const reduced =
      typeof window.matchMedia !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const destination = destinations[event.key];
    const wrapped = wrapPosition(destination, cycle);
    viewport.scrollTo({
      left: wrapped,
      behavior: reduced || wrapped !== destination ? 'instant' : 'smooth',
    });
  };

  useGSAP(
    () => {
      const viewport = viewportRef.current;
      if (!viewport || typeof window.matchMedia !== 'function') return;
      const frames = Array.from(viewport.querySelectorAll<HTMLElement>('[data-film-frame]'));
      const tokens = getComputedStyle(viewport);
      const rise = parseFloat(tokens.getPropertyValue('--crop-film-rise'));
      const angle = parseFloat(tokens.getPropertyValue('--crop-film-angle'));
      const speed = parseFloat(tokens.getPropertyValue('--crop-film-speed'));
      if (![rise, angle, speed].every(Number.isFinite) || speed <= 0) return;
      const media = gsap.matchMedia();
      media.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          reduced: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const reduced = Boolean(context.conditions?.reduced);
          gsap.set(frames, { y: 0, rotation: 0 });
          const setters = frames.map((frame) => ({
            y: gsap.quickSetter(frame, 'y', 'px'),
            rotation: gsap.quickSetter(frame, 'rotation', 'deg'),
          }));
          let scheduled = 0;
          let drag: { pointerId: number; x: number; scroll: number } | null = null;
          let previousCycle = 0;
          const root = viewport.parentElement ?? viewport;
          let visible = false;
          let interacting = false;
          let disposed = false;
          let autoplay: gsap.core.Tween | null = null;
          const syncPlayback = () => {
            const hovered = window.matchMedia('(hover: hover)').matches && root.matches(':hover');
            const focused = root.contains(document.activeElement);
            if (
              reduced ||
              !visible ||
              document.hidden ||
              hovered ||
              focused ||
              interacting ||
              viewport.closest('[inert]')
            )
              autoplay?.pause();
            else autoplay?.resume();
          };
          const cycleWidth = () => frameWidth(viewport) * BOTANICAL_BANNERS.length;
          const rebase = () => {
            const cycle = cycleWidth();
            if (!cycle) return;
            const current = viewport.scrollLeft;
            const next = wrapPosition(current, cycle);
            if (Math.abs(next - current) > 1) {
              viewport.scrollTo({ left: next, behavior: 'instant' });
              if (drag) drag.scroll += next - current;
            }
          };
          const update = () => {
            if (scheduled) cancelAnimationFrame(scheduled);
            scheduled = 0;
            rebase();
            if (reduced || !viewport.clientWidth) return;
            const itemWidth = frameWidth(viewport);
            // Read geometry first; the setters below only write transforms.
            const positions = frames.map((_, index) =>
              Math.max(
                -1.25,
                Math.min(
                  1.25,
                  ((index + 0.5) * itemWidth - viewport.scrollLeft - viewport.clientWidth / 2) /
                    (viewport.clientWidth / 2),
                ),
              ),
            );
            setters.forEach((setter, index) => {
              setter.y(positions[index] ** 2 * rise);
              setter.rotation(positions[index] * angle);
            });
          };
          const schedule = () => {
            if (!scheduled) scheduled = requestAnimationFrame(update);
          };
          const moveTo = (left: number) =>
            viewport.scrollTo({
              left,
              behavior: reduced ? 'instant' : 'smooth',
            });
          const pointerDown = (event: PointerEvent) => {
            interacting = true;
            syncPlayback();
            if (event.pointerType !== 'mouse' || event.button !== 0) return;
            drag = { pointerId: event.pointerId, x: event.clientX, scroll: viewport.scrollLeft };
            viewport.dataset.dragging = 'true';
            viewport.setPointerCapture(event.pointerId);
            viewport.focus({ preventScroll: true });
          };
          const pointerMove = (event: PointerEvent) => {
            if (!drag || event.pointerId !== drag.pointerId) return;
            viewport.scrollLeft = drag.scroll + drag.x - event.clientX;
            rebase();
          };
          const finishDrag = () => {
            interacting = false;
            syncPlayback();
            if (!drag) return;
            const pointerId = drag.pointerId;
            drag = null;
            delete viewport.dataset.dragging;
            if (viewport.hasPointerCapture(pointerId)) viewport.releasePointerCapture(pointerId);
            const step = frameWidth(viewport);
            if (step) moveTo(Math.round(viewport.scrollLeft / step) * step);
          };
          viewport.addEventListener('scroll', schedule, { passive: true });
          viewport.addEventListener('pointerdown', pointerDown);
          viewport.addEventListener('pointermove', pointerMove);
          viewport.addEventListener('pointerup', finishDrag);
          viewport.addEventListener('pointercancel', finishDrag);
          viewport.addEventListener('lostpointercapture', finishDrag);
          const focusOut = () =>
            queueMicrotask(() => {
              if (!disposed) syncPlayback();
            });
          root.addEventListener('pointerenter', syncPlayback);
          root.addEventListener('pointerleave', syncPlayback);
          root.addEventListener('focusin', syncPlayback);
          root.addEventListener('focusout', focusOut);
          document.addEventListener('visibilitychange', syncPlayback);
          // The intro copy stays mounted during reversible map exploration.
          const explorationObserver = new MutationObserver(syncPlayback);
          const copy = viewport.closest('[data-map-hero-copy]');
          if (copy)
            explorationObserver.observe(copy, { attributes: true, attributeFilter: ['inert'] });
          const resize = () => {
            const cycle = cycleWidth();
            if (!cycle) return;
            const priorCycle = previousCycle || cycle;
            const phase = (wrapPosition(viewport.scrollLeft, priorCycle) - priorCycle) / priorCycle;
            viewport.scrollTo({ left: cycle * (1 + phase), behavior: 'instant' });
            previousCycle = cycle;
            if (drag && viewport.hasPointerCapture(drag.pointerId))
              viewport.releasePointerCapture(drag.pointerId);
            drag = null;
            delete viewport.dataset.dragging;
            schedule();
          };
          const observer = new ResizeObserver(resize);
          observer.observe(viewport);
          resize();
          update();
          if (!reduced) {
            const phase = { value: 0 };
            let previousPhase = 0;
            let remainder = 0;
            autoplay = gsap.to(phase, {
              value: 1,
              duration: 1,
              repeat: -1,
              ease: 'none',
              paused: true,
              onUpdate: () => {
                const difference = phase.value - previousPhase;
                previousPhase = phase.value;
                // Retain subpixel travel: some browsers round each scrollLeft assignment.
                remainder += (difference < 0 ? difference + 1 : difference) * speed;
                const travel = Math.floor(remainder);
                if (!travel) return;
                remainder -= travel;
                viewport.scrollLeft += travel;
                schedule();
              },
            });
          }
          const visibilityObserver = new IntersectionObserver((entries) => {
            visible = entries.some((entry) => entry.isIntersecting);
            syncPlayback();
          });
          visibilityObserver.observe(viewport);
          return () => {
            disposed = true;
            autoplay?.kill();
            explorationObserver.disconnect();
            visibilityObserver.disconnect();
            root.removeEventListener('pointerenter', syncPlayback);
            root.removeEventListener('pointerleave', syncPlayback);
            root.removeEventListener('focusin', syncPlayback);
            root.removeEventListener('focusout', focusOut);
            document.removeEventListener('visibilitychange', syncPlayback);
            viewport.removeEventListener('scroll', schedule);
            viewport.removeEventListener('pointerdown', pointerDown);
            viewport.removeEventListener('pointermove', pointerMove);
            viewport.removeEventListener('pointerup', finishDrag);
            viewport.removeEventListener('pointercancel', finishDrag);
            viewport.removeEventListener('lostpointercapture', finishDrag);
            observer.disconnect();
            cancelAnimationFrame(scheduled);
            if (drag && viewport.hasPointerCapture(drag.pointerId))
              viewport.releasePointerCapture(drag.pointerId);
            delete viewport.dataset.dragging;
          };
        },
      );
      return () => media.revert();
    },
    { scope: viewportRef },
  );

  return (
    <div className="mt-10 min-w-0">
      <section
        ref={viewportRef}
        aria-label="Dải ảnh cây trồng"
        aria-describedby={hintId}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Scrollable gallery requires keyboard focus for arrow/Home/End navigation.
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="crop-film-viewport flex cursor-grab items-start overflow-x-auto overflow-y-hidden py-5 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {filmCopies.flatMap((copy) =>
          BOTANICAL_BANNERS.map((scene) => (
            <figure
              key={`${copy}-${scene.id}`}
              aria-hidden={copy !== 0 ? true : undefined}
              className="crop-film-cell relative min-w-0"
            >
              <div data-film-frame className="crop-film-frame rounded-lg">
                <FilmRail />
                <Image
                  src={scene.imageSrc}
                  alt={copy === 0 ? scene.imageAlt : ''}
                  width={240}
                  height={180}
                  draggable={false}
                  sizes="(min-width: 1280px) 112px, (min-width: 768px) 25vw, 50vw"
                  className="aspect-[4/3] w-full rounded-sm object-cover"
                  style={{ objectPosition: scene.photoPosition }}
                />
                <FilmRail />
              </div>
              <figcaption className="sr-only">{scene.name}</figcaption>
            </figure>
          )),
        )}
      </section>
      <p id={hintId} className="sr-only">
        Dải ảnh tự chuyển chậm và lặp vòng, dừng khi tương tác. Kéo hoặc vuốt ngang; dùng phím mũi
        tên trái, phải, Home hoặc End khi dải ảnh được chọn.
      </p>
    </div>
  );
}

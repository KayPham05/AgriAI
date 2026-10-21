import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(useGSAP);

const brandLetters = [
  { id: 'initial', letter: 'A' },
  { id: 'g', letter: 'g' },
  { id: 'r', letter: 'r' },
  { id: 'i', letter: 'i' },
  { id: 'ai-a', letter: 'A' },
  { id: 'ai-i', letter: 'I' },
];

interface LoginSuccessScreenProps {
  userName: string;
  onAnimationComplete: () => void;
  error?: string;
  onRetry: () => void;
  onCancel: () => void;
}
export function LoginSuccessScreen({
  userName,
  onAnimationComplete,
  error,
  onRetry,
  onCancel,
}: LoginSuccessScreenProps) {
  const rootRef = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || typeof window.matchMedia !== 'function') {
        onAnimationComplete();
        return;
      }
      const tokens = getComputedStyle(root);
      const distance = parseFloat(tokens.getPropertyValue('--view-enter-distance'));
      const duration = parseFloat(tokens.getPropertyValue('--view-enter-duration'));
      const stagger = parseFloat(tokens.getPropertyValue('--auth-brand-stagger'));
      if (![distance, duration, stagger].every(Number.isFinite)) {
        onAnimationComplete();
        return;
      }
      const media = gsap.matchMedia();
      media.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          reduced: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          if (context.conditions?.reduced) {
            onAnimationComplete();
            return;
          }
          gsap
            .timeline({
              defaults: { duration, ease: 'power3.out' },
              onComplete: onAnimationComplete,
            })
            .fromTo(
              root.querySelector('[data-auth-logo]'),
              { opacity: 0, y: distance },
              { opacity: 1, y: 0, clearProps: 'opacity,transform' },
            )
            .fromTo(
              root.querySelectorAll('[data-auth-letter]'),
              { opacity: 0, y: distance },
              { opacity: 1, y: 0, stagger, clearProps: 'opacity,transform' },
              '<50%',
            )
            .fromTo(
              root.querySelectorAll('[data-auth-greeting]'),
              { opacity: 0, y: distance },
              { opacity: 1, y: 0, stagger, clearProps: 'opacity,transform' },
            );
        },
      );
      return () => media.revert();
    },
    { scope: rootRef, dependencies: [userName], revertOnUpdate: true },
  );

  return (
    <section
      ref={rootRef}
      className="grid min-h-dvh place-items-center bg-background px-5 py-10"
      role="status"
      aria-label="Đang kết nối AgriAI"
      aria-busy={!error}
    >
      <div className="w-full max-w-lg text-center">
        <div className="flex items-center justify-center gap-4">
          <Image
            data-auth-logo
            src="/images/agriai-leaf-mark.png"
            alt="AgriAI"
            width={64}
            height={64}
            className="size-16 shrink-0 object-contain"
            priority
          />
          <p className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
            <span className="sr-only">AgriAI</span>
            {brandLetters.map(({ id, letter }) => (
              <span key={id} aria-hidden="true" className="inline-block align-bottom">
                <span data-auth-letter className="inline-block">
                  {letter}
                </span>
              </span>
            ))}
          </p>
        </div>
        <h1
          data-auth-greeting
          className="mt-8 break-words text-2xl font-semibold tracking-tight text-balance"
        >
          Chào {userName}.
        </h1>
        {error && (
          <div className="mt-8 space-y-4">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={onRetry}>Thử lại</Button>
              <Button variant="outline" onClick={onCancel}>
                Về trang giới thiệu
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

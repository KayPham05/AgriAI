'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import styles from './AdminLoginSuccessScreen.module.css';

interface AdminLoginSuccessScreenProps {
  userName: string;
  mode?: 'login' | 'logout';
  onAnimationComplete: () => void;
  error?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

export function AdminLoginSuccessScreen({
  userName,
  mode = 'login',
  onAnimationComplete,
  error,
  onRetry,
  onCancel,
}: AdminLoginSuccessScreenProps) {
  const isLogout = mode === 'logout';
  const salutation = isLogout ? 'Tạm biệt' : 'Xin chào';
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (error) return;
    const timer = window.setTimeout(onAnimationComplete, 4000);
    return () => window.clearTimeout(timer);
  }, [onAnimationComplete, error]);
  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  return (
    <section
      role="status"
      aria-label={isLogout ? 'Đã đăng xuất AgriAI' : 'Đang kết nối AgriAI'}
      aria-busy={!isLogout && !error}
      data-paused={hidden || Boolean(error)}
      className={`${styles.screen} grid min-h-dvh place-items-center bg-background px-5 py-8 text-foreground`}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center sm:gap-10 [@media(max-height:500px)]:gap-4">
        <div className="flex items-center justify-center gap-2">
          <Image
            src="/images/agriai-leaf-mark.png"
            alt="AgriAI"
            width={64}
            height={64}
            className="h-14 w-10 object-contain [@media(max-height:500px)]:h-10"
            priority
          />
          <p aria-hidden="true" className="text-3xl font-extrabold tracking-tight text-primary">
            Agri<span className="text-ring">AI</span>
          </p>
        </div>
        <div
          aria-hidden="true"
          className="relative grid size-40 place-items-center rounded-full bg-secondary/60 sm:size-44 [@media(max-height:500px)]:size-28"
        >
          <span
            data-admin-ripple
            className={`${styles.ripple} pointer-events-none absolute inset-0 rounded-full border border-accent/40`}
          />
          <span
            data-admin-ripple
            className={`${styles.ripple} ${styles.delayed} pointer-events-none absolute inset-0 rounded-full border border-accent/40`}
          />
          <svg
            aria-hidden="true"
            viewBox="24 8 112 136"
            className="h-28 w-24 sm:h-32 sm:w-28 [@media(max-height:500px)]:h-20 [@media(max-height:500px)]:w-16"
          >
            <g transform="translate(80 122)">
              <g className={styles.stalk}>
                <rect x="-3" y="-81" width="6" height="81" rx="2" className="fill-accent/70" />
              </g>
              <g className={styles.canopy}>
                <path d="M0 0C-20 2-35-10-40-25C-17-30 0-23 0 0Z" className="fill-accent/70" />
                <path d="M0 0C20 2 35-10 40-25C17-30 0-23 0 0Z" className="fill-accent/70" />
              </g>
            </g>
            <g className="fill-muted-foreground">
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
          <h1
            aria-label={`${salutation}, ${userName}.`}
            className="flex max-w-full flex-col gap-1 wrap-anywhere"
          >
            <span className="text-sm font-medium text-muted-foreground">{salutation},</span>
            <span className="text-2xl font-bold leading-tight tracking-tight">{userName}</span>
          </h1>
          {!error && !isLogout && (
            <div
              role="progressbar"
              aria-label="Đang tải"
              className="mt-5 h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-secondary"
            >
              <div className={`${styles.progress} h-full origin-left rounded-full bg-ring`} />
            </div>
          )}
          <p className="mt-3 text-xs font-semibold tracking-widest text-ring">
            {error ? 'TẠM DỪNG' : isLogout ? 'HẸN GẶP LẠI' : 'ĐANG TẢI'}
          </p>
        </div>
        {error && (
          <div className="space-y-4">
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

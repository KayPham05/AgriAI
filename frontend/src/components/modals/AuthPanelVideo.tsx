'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export function AuthPanelVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.(
      '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
    );
    const sync = () => setEnabled(media?.matches ?? false);
    sync();
    media?.addEventListener('change', sync);
    return () => media?.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled || failed) return;
    const sync = () => {
      if (document.hidden) video.pause();
      else void video.play().catch(() => {});
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      video.pause();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [enabled, failed]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <Image
        src="/media/auth/field-poster.webp"
        alt=""
        fill
        sizes="(min-width: 768px) 448px, 0px"
        className="object-cover"
      />
      {enabled && !failed && (
        <video
          ref={videoRef}
          data-auth-video
          src="/media/auth/field-original.mp4"
          poster="/media/auth/field-poster.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
      <div className="absolute inset-0 bg-primary-hover/75" />
    </div>
  );
}

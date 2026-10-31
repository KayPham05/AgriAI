'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

// Public UI media only; user-uploaded images stay in the private storage bucket.
const AUTH_MEDIA_ROOT = 'https://pub-5b7b85dc2aa84f1ca62aa18308983f37.r2.dev/auth';
const VIDEO_URL = `${AUTH_MEDIA_ROOT}/field-v1.mp4`;
const POSTER_URL = `${AUTH_MEDIA_ROOT}/field-poster-v1.webp`;

export function AuthPanelVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

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
      {!posterFailed && (
        <Image
          unoptimized
          src={POSTER_URL}
          alt=""
          fill
          sizes="(min-width: 768px) 448px, 0px"
          className="object-cover"
          onError={() => setPosterFailed(true)}
        />
      )}
      {enabled && !failed && (
        <video
          ref={videoRef}
          data-auth-video
          src={VIDEO_URL}
          poster={POSTER_URL}
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

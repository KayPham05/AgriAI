'use client';

import { use, useEffect, useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { AuthContext } from '@/providers/AppContexts';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
const protectedPath = /^\/api\/predictions\/[a-f0-9-]{36}\/images\/[a-f0-9-]{36}$/i;

export function PrivateImage({ src, alt, ...props }: ImageProps) {
  const token = use(AuthContext)?.session?.token;
  const path = typeof src === 'string' && protectedPath.test(src) ? src : null;
  const [loaded, setLoaded] = useState<{ path: string; token: string; url: string } | null>(null);

  useEffect(() => {
    if (!path || !token) return;
    const imagePath = path;
    const authToken = token;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    async function loadImage() {
      try {
        const response = await fetch(`${apiBase}${imagePath}`, {
          headers: { Authorization: `Bearer ${authToken}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Image unavailable');
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ path: imagePath, token: authToken, url: objectUrl });
      } catch {
        if (!controller.signal.aborted) setLoaded({ path: imagePath, token: authToken, url: '' });
      }
    }
    void loadImage();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, token]);

  const imageSrc = path ? (loaded?.path === path && loaded.token === token ? loaded.url : '') : src;
  if (!imageSrc) {
    const pending = path && token && !(loaded?.path === path && loaded.token === token);
    return (
      <span
        className={`flex items-center justify-center bg-surface-muted text-sm text-muted-foreground ${props.className ?? ''}`}
      >
        {pending ? 'Đang tải ảnh…' : 'Ảnh không còn khả dụng'}
      </span>
    );
  }
  return <Image {...props} src={imageSrc} alt={alt} unoptimized />;
}

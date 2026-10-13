import { useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReferenceImageProps {
  src?: string;
  alt: string;
  className?: string;
}

/** Never substitute a healthy crop photograph for a missing disease reference. */
export function ReferenceImage({ src, alt, className }: ReferenceImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!src || src === failedSource) {
    return (
      <span
        className={cn(
          'flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 bg-surface-muted p-6 text-center whitespace-normal',
          className,
        )}
      >
        <ImageOff className="size-6 text-primary" aria-hidden="true" />
        <span className="text-sm font-medium text-muted-foreground">Chưa có ảnh đối chiếu</span>
      </span>
    );
  }

  return (
    <Image
      unoptimized
      src={src}
      alt={alt}
      width={640}
      height={480}
      loading="lazy"
      onError={() => setFailedSource(src)}
      className={cn('aspect-[4/3] w-full object-cover', className)}
    />
  );
}

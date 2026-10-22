'use client';

import { useId } from 'react';
import { BookOpen, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HomeBannerSlideshow } from '@/components/home/HomeBannerSlideshow';
import type { NavigationTab } from '@/types';

export function HomeLandingHero({ onNavigate }: { onNavigate: (tab: NavigationTab) => void }) {
  const headlineId = useId();
  return (
    <section
      aria-label="Khám phá AgriAI"
      className="relative isolate flex min-h-[calc(100svh-6rem)] flex-col bg-background"
    >
      <div className="relative z-30 mx-auto w-full max-w-4xl px-5 pt-3 pb-4 text-center sm:px-8 sm:pt-4">
        <h1 className="font-bold tracking-tight" aria-label="Hiểu từng chiếc lá Giữ trọn mùa xanh">
          <span className="sr-only">Hiểu từng chiếc lá Giữ trọn mùa xanh</span>
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 800 195"
            className="block h-auto w-full"
          >
            <defs>
              <path id={`${headlineId}-first`} d="M 25 110 Q 400 30 775 110" />
              <path id={`${headlineId}-second`} d="M 25 190 Q 400 110 775 190" />
            </defs>
            <text className="fill-foreground" fontSize="60" textAnchor="middle">
              <textPath href={`#${headlineId}-first`} startOffset="50%">
                Hiểu từng chiếc lá
              </textPath>
            </text>
            <text className="fill-primary" fontSize="60" textAnchor="middle">
              <textPath href={`#${headlineId}-second`} startOffset="50%">
                Giữ trọn mùa xanh
              </textPath>
            </text>
          </svg>
        </h1>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            className="h-auto min-h-11 max-w-full whitespace-normal px-6"
            onClick={() => onNavigate('diagnose')}
          >
            <Camera aria-hidden="true" /> Kiểm tra lá
          </Button>
          <Button
            className="h-auto min-h-11 max-w-full whitespace-normal px-6"
            variant="outline"
            onClick={() => onNavigate('diseases')}
          >
            <BookOpen aria-hidden="true" /> Tra cứu bệnh
          </Button>
        </div>
      </div>

      <div aria-hidden="true" className="min-h-72 flex-1" />
      <figure className="absolute inset-0 overflow-hidden">
        <HomeBannerSlideshow />
        <figcaption className="pointer-events-none absolute inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex flex-col items-start justify-between gap-5 p-6 text-primary-foreground sm:flex-row sm:items-end sm:p-8 md:bottom-0 lg:p-12">
          <p className="max-w-sm text-2xl font-semibold leading-tight tracking-tight text-balance sm:text-3xl lg:text-4xl">
            Chăm cây bắt đầu từ việc hiểu chiếc lá
          </p>
        </figcaption>
      </figure>
    </section>
  );
}

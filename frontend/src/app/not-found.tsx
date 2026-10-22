'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import foliage from '@/assets/banner-leaves/tea-foliage-cutout.png';

export default function NotFound() {
  const router = useRouter();
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.replace('/');
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 py-10 sm:px-8 md:grid-cols-2 md:gap-12 lg:px-12 lg:py-16">
        <div className="order-2 min-w-0 md:order-1">
          <p className="mb-4 text-sm font-semibold text-primary">Lỗi 404</p>
          <h1 className="max-w-md text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl">
            Không tìm thấy trang
          </h1>
          <p className="mt-5 max-w-md leading-7 text-muted-foreground">
            Đường dẫn này không tồn tại hoặc đã thay đổi. Hãy trở về trang chủ để tiếp tục khám phá
            AgriAI.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="min-h-11">
              <Link href="/">
                Về trang chủ <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" className="min-h-11" onClick={goBack}>
              <ArrowLeft aria-hidden="true" /> Quay lại
            </Button>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none relative order-1 aspect-[4/3] w-full max-w-md justify-self-center overflow-hidden rounded-media bg-secondary md:order-2"
        >
          <span className="absolute top-6 left-6 text-8xl font-bold leading-none tracking-tight text-primary sm:top-8 sm:left-8 sm:text-9xl">
            404
          </span>
          <Image
            src={foliage}
            alt=""
            fill
            sizes="(min-width: 768px) 448px, 90vw"
            className="translate-x-12 translate-y-12 object-contain"
          />
        </div>
      </main>
      <footer className="mx-auto w-full max-w-6xl px-5 py-6 text-sm text-muted-foreground sm:px-8 lg:px-12">
        AgriAI · Vì cây trồng Việt
      </footer>
    </div>
  );
}

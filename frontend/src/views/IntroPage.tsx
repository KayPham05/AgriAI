'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, ImageUp, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CropMap } from '@/components/common/CropMap';
import { CropFilmStrip } from '@/components/common/CropFilmStrip';
import { SUPPORTED_PLANTS } from '@/data/plantData';
import { CROP_PHOTOS } from '@/data/cropPhotos';

gsap.registerPlugin(useGSAP);

interface IntroPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const workflowSteps = [
  {
    icon: ImageUp,
    title: 'Chọn một ảnh lá rõ nét',
    description: 'Tải ảnh JPG hoặc PNG, ưu tiên một chiếc lá dưới ánh sáng tự nhiên.',
  },
  {
    icon: ScanSearch,
    model: 'ConvNeXt-Tiny',
    title: 'Phân loại bệnh lá cây',
    description: 'Ảnh được kiểm tra trước khi gửi tới mô hình phân loại của AgriAI.',
  },
  {
    icon: CheckCircle2,
    title: 'Đọc kết quả có ngữ cảnh',
    description: 'Xem lớp dự đoán, độ tin cậy và lưu lại kết quả để đối chiếu.',
  },
];

const principles = [
  'Mỗi kết quả đi kèm lớp dự đoán và độ tin cậy.',
  'Ảnh đủ sáng, một lá chính giúp kết quả dễ đối chiếu hơn.',
  'Kết quả chỉ hỗ trợ tham khảo, không thay thế chuyên gia.',
];

export function IntroPage({ onLogin, onRegister }: IntroPageProps) {
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = pageRef.current;
      if (!root || typeof window.matchMedia !== 'function') return;
      const tokens = getComputedStyle(root);
      const distance = parseFloat(tokens.getPropertyValue('--view-enter-distance'));
      const duration = parseFloat(tokens.getPropertyValue('--view-enter-duration'));
      const stagger = parseFloat(tokens.getPropertyValue('--selection-enter-stagger'));
      const opacity = parseFloat(tokens.getPropertyValue('--selection-enter-opacity'));
      if (![distance, duration, stagger, opacity].every(Number.isFinite)) return;
      const media = gsap.matchMedia();

      media.add(
        '(prefers-reduced-motion: no-preference)',
        (mediaContext) => {
          const timelines = new Set<gsap.core.Timeline>();
          const reveal = mediaContext.add('revealGroup', (group: Element) => {
            const targets = group.querySelectorAll('[data-intro-reveal]');
            if (!targets.length) return;
            const timeline = gsap.timeline({
              defaults: { duration, ease: 'power3.out' },
            });
            timelines.add(timeline);
            timeline.fromTo(
              targets,
              { opacity, y: distance },
              { opacity: 1, y: 0, stagger, clearProps: 'transform,opacity' },
            );
          });
          const hero = root.querySelector('[data-intro-copy]');
          if (hero) reveal(hero);

          // Leave offscreen content readable; enhance each group only on first entry.
          const groups = root.querySelectorAll('[data-intro-reveal-group]');
          if (typeof IntersectionObserver !== 'function') return;
          const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              observer.unobserve(entry.target);
              reveal(entry.target);
            }
          });
          for (const group of groups) observer.observe(group);
          return () => {
            observer.disconnect();
            for (const timeline of timelines) timeline.revert();
          };
        },
        pageRef,
      );

      return () => media.revert();
    },
    { scope: pageRef },
  );

  return (
    <div ref={pageRef} className="min-h-dvh bg-background text-foreground">
      <a href="#intro" className="skip-link">
        Đến nội dung chính
      </a>
      <header className="sticky top-0 z-40 px-5 py-3 sm:px-8 lg:px-12">
        <div className="navigation-bar mx-auto flex h-18 max-w-7xl items-center justify-between gap-3 rounded-card border border-border bg-surface px-3 sm:px-5">
          <a
            href="#intro"
            className="flex shrink-0 items-center gap-3 rounded-lg"
            aria-label="AgriAI - Trang giới thiệu"
          >
            <Image
              src="/images/logo.png"
              alt="Logo AgriAI"
              width={44}
              height={44}
              className="size-11 object-contain"
            />
            <span className="hidden text-lg font-bold tracking-tight text-primary sm:inline">
              AgriAI
            </span>
          </a>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onLogin}>
              Đăng nhập
            </Button>
            <Button type="button" onClick={onRegister}>
              Tạo tài khoản
            </Button>
          </div>
        </div>
      </header>

      <main id="intro" tabIndex={-1}>
        <section aria-label="Giới thiệu AgriAI" className="border-b border-border">
          <CropMap plants={SUPPORTED_PLANTS}>
            <div data-intro-copy className="min-w-0">
              <p data-intro-reveal className="text-sm font-semibold text-primary">
                Phân loại bệnh lá cây từ ảnh
              </p>
              <h1
                data-intro-reveal
                className="mt-4 text-4xl font-bold leading-tight tracking-tight text-balance lg:text-5xl"
              >
                Nhìn kỹ chiếc lá. <span className="text-primary">Hiểu thêm về cây.</span>
              </h1>
              <p
                data-intro-reveal
                className="mt-5 max-w-lg text-base leading-7 text-muted-foreground md:text-lg"
              >
                AgriAI giúp bạn phân loại bệnh lá cây từ một bức ảnh và đọc kết quả để đối chiếu với
                những gì bạn quan sát.
              </p>
              <div data-intro-reveal className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button type="button" size="lg" onClick={onRegister}>
                  Tạo tài khoản <ArrowRight aria-hidden="true" />
                </Button>
                <Button type="button" size="lg" variant="outline" asChild>
                  <a href="#how-it-works">Xem cách hoạt động</a>
                </Button>
              </div>
              <CropFilmStrip />
            </div>
          </CropMap>
        </section>

        <section id="how-it-works" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 md:py-16 lg:px-12">
            <div data-intro-reveal-group className="grid items-end gap-5 lg:grid-cols-2 lg:gap-16">
              <h2 data-intro-reveal className="text-3xl font-semibold tracking-tight text-balance">
                Từ ảnh lá đến thông tin có thể đối chiếu.
              </h2>
              <p data-intro-reveal className="max-w-lg leading-7 text-muted-foreground">
                Chọn ảnh, xem dự đoán rồi đối chiếu với triệu chứng trên cây. Bạn có thể lưu kết quả
                để xem lại.
              </p>
            </div>
            <div className="mt-9 grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
              <figure data-intro-reveal-group>
                <div data-intro-reveal>
                  <Image
                    src={CROP_PHOTOS.rice.imageSrc}
                    alt={CROP_PHOTOS.rice.imageAlt}
                    width={1536}
                    height={1024}
                    sizes="(min-width: 1280px) 560px, (min-width: 1024px) 46vw, 100vw"
                    className="aspect-[4/3] w-full rounded-media object-cover"
                  />
                </div>
                <figcaption className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
                  Khung hình đủ sáng, một lá chính và nền ít nhiễu giúp mô hình nhận được tín hiệu
                  hữu ích hơn.
                </figcaption>
              </figure>
              <div
                data-intro-reveal-group
                className="divide-y divide-border border-t border-border"
              >
                {workflowSteps.map(({ icon: Icon, model, title, description }) => (
                  <article data-intro-reveal key={title} className="flex gap-4 py-6 last:pb-0">
                    <Icon className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <h3 className="text-lg font-semibold">{title}</h3>
                      <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                        {description}
                      </p>
                      {model && <p className="mt-2 text-xs font-medium text-primary">{model}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          data-intro-reveal-group
          className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:py-16 lg:grid-cols-2 lg:gap-16 lg:px-12"
        >
          <div data-intro-reveal>
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance">
              AI hỗ trợ quan sát. Con người đưa ra quyết định.
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
              AgriAI trình bày kết quả và độ tin cậy để bạn có thêm căn cứ, không biến một dự đoán
              thành kết luận tuyệt đối.
            </p>
          </div>
          <ul className="space-y-5">
            {principles.map((principle) => (
              <li data-intro-reveal key={principle} className="flex gap-3">
                <CheckCircle2 className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="leading-7">{principle}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-primary text-primary-foreground">
          <div
            data-intro-reveal-group
            className="mx-auto flex max-w-7xl flex-col items-start gap-7 px-5 py-12 sm:px-8 md:py-16 lg:flex-row lg:items-center lg:justify-between lg:px-12"
          >
            <div data-intro-reveal className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">
                Bắt đầu với một chiếc lá rõ nét.
              </h2>
              <p className="mt-3 leading-7 text-primary-foreground">
                Tạo tài khoản để lưu lịch sử phân loại và theo dõi những mẫu bạn đã kiểm tra.
              </p>
            </div>
            <div data-intro-reveal>
              <Button type="button" size="lg" variant="secondary" onClick={onRegister}>
                Tạo tài khoản <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-muted-foreground sm:px-8 md:flex-row md:items-start md:justify-between lg:px-12">
          <span className="shrink-0 font-semibold text-foreground">AgriAI · Vì cây trồng Việt</span>
        </div>
      </footer>
    </div>
  );
}

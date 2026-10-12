'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
export function RouteError({ retry }: { retry: () => void }) {
  return (
    <section
      className="mx-auto flex max-w-7xl flex-col items-start gap-5 px-5 py-12 sm:px-8 lg:px-12"
      role="alert"
    >
      <h1 className="text-3xl font-bold text-primary">Không thể mở trang</h1>
      <p className="text-muted-foreground">Vui lòng thử lại hoặc trở về trang giới thiệu.</p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={retry}>Thử lại</Button>
        <Button asChild variant="outline">
          <Link href="/">Về AgriAI</Link>
        </Button>
      </div>
    </section>
  );
}

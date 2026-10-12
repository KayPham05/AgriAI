import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-7xl flex-col items-start justify-center gap-5 px-5 py-12 sm:px-8 lg:px-12">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="text-3xl font-bold text-primary">Không tìm thấy trang</h1>
      <p className="text-muted-foreground">Đường dẫn này không tồn tại hoặc đã thay đổi.</p>
      <Button asChild>
        <Link href="/">Về AgriAI</Link>
      </Button>
    </main>
  );
}

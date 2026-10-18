import Link from 'next/link';
import { Button } from '@/components/ui/button';
export function MissingCatalogItem({ kind }: { kind: 'plants' | 'diseases' }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
      <h1 className="text-3xl font-bold text-primary">
        {kind === 'plants' ? 'Không tìm thấy cây trồng' : 'Không tìm thấy bệnh'}
      </h1>
      <p className="my-5 text-muted-foreground">Mục này không có trong danh mục hiện tại.</p>
      <Button asChild variant="outline">
        <Link href={kind === 'plants' ? '/plants' : '/diseases'}>Về danh mục</Link>
      </Button>
    </section>
  );
}

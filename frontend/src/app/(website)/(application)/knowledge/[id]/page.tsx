import type { Metadata } from 'next';
import { CatalogRoute } from '@/features/knowledge/CatalogRoute';
export const metadata: Metadata = { title: 'Chi tiết bài viết | AgriAI' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CatalogRoute kind="knowledge-documents" id={id} />;
}

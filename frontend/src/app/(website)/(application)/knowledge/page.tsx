import type { Metadata } from 'next';
import { CatalogRoute } from '@/features/knowledge/CatalogRoute';
export const metadata: Metadata = { title: 'Bài viết nông nghiệp | AgriAI' };
export default function Page() {
  return <CatalogRoute kind="knowledge-documents" />;
}

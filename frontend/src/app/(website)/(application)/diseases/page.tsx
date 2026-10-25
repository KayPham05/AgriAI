import type { Metadata } from 'next';
import { CatalogRoute } from '@/features/knowledge/CatalogRoute';
export const metadata: Metadata = { title: 'Bệnh thường gặp | AgriAI' };
export default function Page() {
  return <CatalogRoute kind="diseases" />;
}

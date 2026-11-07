import type { Metadata } from 'next';
import { CatalogRoute } from '@/features/knowledge/CatalogRoute';
export const metadata: Metadata = { title: 'Tra cứu thuốc | AgriAI' };
export default function Page() {
  return <CatalogRoute kind="medicines" />;
}

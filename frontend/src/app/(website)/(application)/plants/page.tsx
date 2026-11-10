import type { Metadata } from 'next';
import { CatalogRoute } from '@/features/knowledge/CatalogRoute';
export const metadata: Metadata = { title: 'Cây trồng | AgriAI' };
export default function Page() {
  return <CatalogRoute kind="plants" />;
}

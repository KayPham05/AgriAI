import type { Metadata } from 'next';
import { DiseasesRoute } from '@/features/diseases/DiseasesRoute';
export const metadata: Metadata = { title: 'Bệnh thường gặp | AgriAI' };
export default function Page() {
  return <DiseasesRoute />;
}

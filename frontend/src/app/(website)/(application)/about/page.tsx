import type { Metadata } from 'next';
import { AboutRoute } from '@/features/about/AboutRoute';
export const metadata: Metadata = { title: 'Về dự án | AgriAI' };
export default function Page() {
  return <AboutRoute />;
}

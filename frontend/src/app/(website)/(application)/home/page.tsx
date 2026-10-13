import type { Metadata } from 'next';
import { HomeRoute } from '@/features/home/HomeRoute';
export const metadata: Metadata = { title: 'Trang chủ | AgriAI' };
export default function Page() {
  return <HomeRoute />;
}

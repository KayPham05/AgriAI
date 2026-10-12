import type { Metadata } from 'next';
import { HistoryRoute } from '@/features/history/HistoryRoute';
export const metadata: Metadata = { title: 'Mẫu đã lưu | AgriAI' };
export default function Page() {
  return <HistoryRoute />;
}

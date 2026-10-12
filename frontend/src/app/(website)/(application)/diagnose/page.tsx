import type { Metadata } from 'next';
import { DiagnoseRoute } from '@/features/diagnosis/DiagnoseRoute';
export const metadata: Metadata = { title: 'Kiểm tra lá | AgriAI' };
export default function Page() {
  return <DiagnoseRoute />;
}

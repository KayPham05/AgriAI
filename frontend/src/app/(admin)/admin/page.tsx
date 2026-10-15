import type { Metadata } from 'next';
import { AdminCrmPage } from '@/features/admin/AdminCrmPage';

export const metadata: Metadata = {
  title: 'Quản trị - AgriAI',
  description: 'Không gian quản trị AgriAI. Dữ liệu quản trị minh họa, chỉ mô phỏng trên frontend.',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminCrmPage />;
}

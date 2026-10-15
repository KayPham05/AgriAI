import type { Metadata } from 'next';
import { AdminCrmPage } from '@/features/admin/AdminCrmPage';

export const metadata: Metadata = {
  title: 'Quản trị - AgriAI',
  description: 'Không gian quản trị AgriAI. Dữ liệu được hiển thị sau khi kết nối API quản trị.',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminCrmPage />;
}

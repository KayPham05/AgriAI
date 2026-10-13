import type { Metadata } from 'next';
import { ProfileRoute } from '@/features/profile/ProfileRoute';
export const metadata: Metadata = { title: 'Hồ sơ cá nhân | AgriAI' };
export default function Page() {
  return <ProfileRoute />;
}

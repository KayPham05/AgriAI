import type { Metadata } from 'next';
import { AgriculturalProfilesRoute } from '@/features/agricultural-profiles/AgriculturalProfilesRoute';

export const metadata: Metadata = { title: 'Hồ sơ nông nghiệp | AgriAI' };

export default function Page() {
  return <AgriculturalProfilesRoute />;
}

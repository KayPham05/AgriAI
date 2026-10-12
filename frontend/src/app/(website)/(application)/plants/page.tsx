import type { Metadata } from 'next';
import { PlantsRoute } from '@/features/plants/PlantsRoute';
export const metadata: Metadata = { title: 'Cây trồng | AgriAI' };
export default function Page() {
  return <PlantsRoute />;
}

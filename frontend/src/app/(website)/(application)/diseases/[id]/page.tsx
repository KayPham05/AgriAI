import type { Metadata } from 'next';
import { DiseaseDetailRoute } from '@/features/diseases/DiseaseDetailRoute';
import { ALL_DISEASES } from '@/data/plantData';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const disease = ALL_DISEASES.find((item) => item.id === id);
  return { title: `${disease?.name ?? 'Chi tiết bệnh'} | AgriAI` };
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DiseaseDetailRoute id={id} />;
}

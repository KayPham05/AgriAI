import type { Metadata } from 'next';
import { PlantDetailRoute } from '@/features/plants/PlantDetailRoute';
import { SUPPORTED_PLANTS } from '@/data/plantData';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const plant = SUPPORTED_PLANTS.find((item) => item.id === id);
  return { title: `${plant?.name ?? 'Chi tiết cây trồng'} | AgriAI` };
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlantDetailRoute id={id} />;
}

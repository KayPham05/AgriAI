import type { Metadata } from 'next';
import { CatalogRoute } from '@/features/knowledge/CatalogRoute';
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
  return <CatalogRoute kind="plants" id={id} />;
}

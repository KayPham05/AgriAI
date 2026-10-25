import type { CatalogRecord, PlantDiseasePair } from '@/services/knowledgeApi';

export const pair: PlantDiseasePair = {
  id: 'pair-a',
  plantId: 'plant-a',
  diseaseId: 'disease-a',
  plantName: 'Cà chua',
  diseaseName: 'Cháy lá',
  classIndex: 0,
  className: 'Ca_chua___Chay_la_som',
  isActive: true,
};
export const article: CatalogRecord = {
  id: 'article-a',
  title: 'Chăm sóc vườn',
  content: 'Nội dung đã duyệt',
  sourceUrl: 'https://example.test/source',
  plantDiseaseIds: ['pair-a'],
  isActive: true,
  isApproved: true,
  isPublic: true,
  createdAt: '2026-10-25T00:00:00Z',
  updatedAt: '2026-10-25T00:00:00Z',
};
export const medicine: CatalogRecord = {
  id: 'medicine-a',
  productName: 'Sản phẩm kiểm thử',
  activeIngredient: 'Hoạt chất kiểm thử',
  targetUse: 'Đối tượng kiểm thử',
  sourceUrl: 'https://example.test/source',
  safetyWarning: 'Cảnh báo kiểm thử',
  labelReference: 'Nhãn kiểm thử',
  uses: [
    {
      plantDiseaseId: 'pair-a',
      labelDirections: 'Hướng dẫn kiểm thử',
      isLabelVerified: true,
      isApproved: true,
    },
  ],
  isActive: true,
  isApproved: true,
  isPublic: true,
  createdAt: '2026-10-25T00:00:00Z',
  updatedAt: '2026-10-25T00:00:00Z',
};
export function page(items: unknown[], totalCount = items.length) {
  return {
    items,
    totalCount,
    pageNumber: 1,
    pageSize: 20,
    totalPages: Math.ceil(totalCount / 20),
    hasNextPage: totalCount > 20,
    hasPreviousPage: false,
  };
}
export function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status });
}

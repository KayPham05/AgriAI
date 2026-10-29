import type { CatalogKind, CatalogRecord } from '@/services/knowledgeApi';

export const catalogLabels: Record<CatalogKind, string> = {
  plants: 'Cây trồng',
  diseases: 'Bệnh cây',
  medicines: 'Thuốc bảo vệ thực vật',
  'knowledge-documents': 'Bài viết',
};
export function publicPath(kind: CatalogKind): string {
  return kind === 'knowledge-documents' ? '/knowledge' : `/${kind}`;
}
export function isPublicCatalogPath(path: string): boolean {
  return /^\/(plants|diseases|medicines|knowledge)(\/[^/]+)?\/?$/.test(path);
}
export function safeSource(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}
export function catalogError(error: unknown): string {
  return error instanceof Error && error.name !== 'TypeError'
    ? error.message
    : 'Không thể kết nối máy chủ. Vui lòng thử lại.';
}
export interface ContentField {
  key: keyof CatalogRecord;
  label: string;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
}
const common: ContentField[] = [
  { key: 'name', label: 'Tên danh mục', required: true, maxLength: 100 },
  { key: 'vietnameseName', label: 'Tên tiếng Việt', maxLength: 100 },
  { key: 'description', label: 'Mô tả', multiline: true },
];
export const contentFields: Record<CatalogKind, ContentField[]> = {
  plants: [...common, { key: 'scientificName', label: 'Tên khoa học', maxLength: 200 }],
  diseases: [
    ...common,
    { key: 'symptoms', label: 'Triệu chứng', multiline: true },
    { key: 'treatment', label: 'Hướng xử lý', multiline: true },
    { key: 'prevention', label: 'Phòng ngừa', multiline: true },
  ],
  medicines: [
    { key: 'productName', label: 'Tên sản phẩm', required: true, maxLength: 200 },
    { key: 'activeIngredient', label: 'Hoạt chất', required: true },
    { key: 'sourceUrl', label: 'Link nguồn', required: true },
    { key: 'safetyWarning', label: 'Cảnh báo an toàn', required: true, multiline: true },
    { key: 'labelReference', label: 'Tham chiếu nhãn', required: true, multiline: true },
  ],
  'knowledge-documents': [
    { key: 'title', label: 'Tiêu đề', required: true, maxLength: 200 },
    { key: 'content', label: 'Nội dung', required: true, multiline: true },
    { key: 'sourceUrl', label: 'Link nguồn', required: true },
  ],
};

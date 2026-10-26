export type CatalogKind = 'plants' | 'diseases' | 'medicines' | 'knowledge-documents';
export interface Publication {
  isActive: boolean;
  isApproved: boolean;
  isPublic: boolean;
}
export interface CatalogRecord {
  id: string;
  name?: string;
  vietnameseName?: string | null;
  scientificName?: string | null;
  description?: string | null;
  symptoms?: string | null;
  treatment?: string | null;
  prevention?: string | null;
  isContentApproved?: boolean | null;
  conditionType?: string | null;
  productName?: string;
  activeIngredient?: string;
  targetUse?: string;
  sourceUrl?: string;
  safetyWarning?: string;
  labelReference?: string;
  title?: string;
  content?: string;
  plantDiseaseIds?: string[];
  uses?: MedicineUse[];
  isActive: boolean;
  isApproved?: boolean;
  isPublic?: boolean;
  createdAt: string;
  updatedAt?: string;
}
export interface MedicineUse {
  plantDiseaseId: string;
  labelDirections: string;
  isLabelVerified: boolean;
  isApproved: boolean;
}
export interface PlantDiseasePair {
  id: string;
  plantId: string;
  diseaseId: string;
  plantName: string;
  diseaseName: string;
  className: string;
  classIndex: number;
  isActive: boolean;
}
export interface CatalogPage<T = CatalogRecord> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
export interface CatalogFilter {
  search?: string;
  plantId?: string;
  diseaseId?: string;
  pageNumber?: number;
}

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
export class CatalogApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function errorText(status: number, body: unknown): string {
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Tài khoản không có quyền thực hiện thao tác này.';
  if (status === 404) return 'Nội dung không còn khả dụng hoặc chưa được công khai.';
  if (body && typeof body === 'object') {
    const detail = body as { message?: unknown; errors?: unknown };
    if (typeof detail.message === 'string') return detail.message;
    if (detail.errors && typeof detail.errors === 'object') {
      return Object.entries(detail.errors)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
        .join('; ');
    }
  }
  return 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
}

export async function catalogRequest<T>(
  path: string,
  options: {
    token?: string;
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    signal: options.signal,
    cache: 'no-store',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body: unknown =
    response.status === 204 ? undefined : await response.json().catch(() => null);
  if (!response.ok) throw new CatalogApiError(response.status, errorText(response.status, body));
  return body as T;
}

export function catalogPath(kind: CatalogKind, token?: string): string {
  return `/api/${token && (kind === 'medicines' || kind === 'knowledge-documents') ? 'admin/' : ''}${kind}`;
}
export function recordName(record: CatalogRecord): string {
  return (
    record.productName ||
    record.title ||
    record.vietnameseName?.trim() ||
    record.name ||
    'Chưa có tên'
  );
}

export async function readCatalogPage(
  kind: CatalogKind,
  filter: CatalogFilter = {},
  token?: string,
  signal?: AbortSignal,
): Promise<CatalogPage> {
  const pageNumber = filter.pageNumber ?? 1;
  const pageSize = 20;
  if (kind === 'plants' || kind === 'diseases') {
    const records = await catalogRequest<CatalogRecord[]>(
      `${catalogPath(kind)}${token ? '?includeInactive=true' : ''}`,
      { token, signal },
    );
    const search = filter.search?.trim().toLocaleLowerCase('vi') ?? '';
    const items = records.filter((record) =>
      recordName(record).toLocaleLowerCase('vi').includes(search),
    );
    return {
      items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
      pageNumber,
      pageSize,
      totalCount: items.length,
      totalPages: Math.ceil(items.length / pageSize),
      hasNextPage: pageNumber * pageSize < items.length,
      hasPreviousPage: pageNumber > 1,
    };
  }
  const query = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) });
  for (const key of ['search', 'plantId', 'diseaseId'] as const)
    if (filter[key]) query.set(key, filter[key]);
  return catalogRequest(`${catalogPath(kind, token)}?${query}`, { token, signal });
}

export async function loadAllPairs(
  token?: string,
  signal?: AbortSignal,
): Promise<PlantDiseasePair[]> {
  const pairs: PlantDiseasePair[] = [];
  let pageNumber = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const page = await catalogRequest<CatalogPage<PlantDiseasePair>>(
      `/api/${token ? 'admin/' : ''}plant-diseases?pageNumber=${pageNumber}&pageSize=100`,
      { token, signal },
    );
    pairs.push(...page.items);
    hasNextPage = page.hasNextPage;
    pageNumber++;
  }
  return pairs;
}

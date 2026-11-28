export interface HistoryFilter {
  agriculturalProfileId?: string;
  plantId?: string;
  diseaseId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface HistoryListItem {
  id: string;
  plantName: string;
  diseaseName: string;
  confidence: number;
  createdAt: string;
  isImageExpired: boolean;
}

export type FetchHistoryListResult =
  | { kind: 'loaded'; items: HistoryListItem[]; pageNumber: number; totalCount: number; hasMore: boolean }
  | { kind: 'invalid-filter'; message: string }
  | { kind: 'unauthorized' }
  | { kind: 'error'; reason: 'network' | 'timeout' | 'service' }
  | { kind: 'cancelled' };

export interface FetchHistoryListDeps {
  filter?: HistoryFilter;
  pageNumber?: number;
  pageSize?: number;
  readToken: () => Promise<string | null>;
  request: (url: string, init: RequestInit) => Promise<Pick<Response, 'status' | 'json'>>;
  apiOrigin: string | undefined;
  allowHttp?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const TIMEOUT_MS = 10_000;
const DEFAULT_PAGE_SIZE = 10;

export function buildHistoryQueryUrl(
  apiOrigin: string | undefined,
  allowHttp: boolean,
  filter: HistoryFilter,
  pageNumber: number,
  pageSize: number,
): string | null {
  try {
    const url = new URL(apiOrigin ?? '');
    const supported = url.protocol === 'https:' || (allowHttp && url.protocol === 'http:');
    if (!supported || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      return null;
    }
    const params = new URLSearchParams();
    params.set('pageNumber', String(pageNumber));
    params.set('pageSize', String(pageSize));
    for (const [key, value] of Object.entries(filter)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        params.set(key, value.trim());
      }
    }
    return `${url.origin}/api/predictions?${params.toString()}`;
  } catch {
    return null;
  }
}

export function validateDateRange(fromDate?: string, toDate?: string): string | null {
  if (!fromDate?.trim() || !toDate?.trim()) return null;
  const from = new Date(fromDate.trim());
  const to = new Date(toDate.trim());
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return 'Định dạng ngày lọc chưa hợp lệ.';
  }
  if (from.getTime() > to.getTime()) {
    return 'Ngày bắt đầu không được lớn hơn ngày kết thúc.';
  }
  return null;
}

function pickName(vn: unknown, fallback: unknown, def = ''): string {
  if (typeof vn === 'string' && vn.trim()) return vn.trim();
  if (typeof fallback === 'string' && fallback.trim()) return fallback.trim();
  return def;
}

function parseHistoryItem(raw: unknown): HistoryListItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id.trim()) return null;
  const images = Array.isArray(r.images) ? r.images : [];
  const isImageExpired =
    images.length > 0 &&
    images.every((img) => img && typeof img === 'object' && (img as Record<string, unknown>).isExpired === true);

  return {
    id: r.id.trim(),
    plantName: pickName(r.plantVietnameseName, r.plantName),
    diseaseName: pickName(r.diseaseVietnameseName, r.diseaseName, 'Kết quả chẩn đoán'),
    confidence: typeof r.confidence === 'number' && Number.isFinite(r.confidence) ? r.confidence : 0,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : '',
    isImageExpired,
  };
}

/** Fetches paginated prediction history for an authenticated User (GET /api/predictions). */
export async function fetchHistoryList(deps: FetchHistoryListDeps): Promise<FetchHistoryListResult> {
  if (deps.signal?.aborted) return { kind: 'cancelled' };
  const filter = deps.filter ?? {};
  const dateError = validateDateRange(filter.fromDate, filter.toDate);
  if (dateError) return { kind: 'invalid-filter', message: dateError };

  const token = await deps.readToken();
  if (!token) return { kind: 'unauthorized' };

  const pageNumber = deps.pageNumber ?? 1;
  const pageSize = deps.pageSize ?? DEFAULT_PAGE_SIZE;
  const url = buildHistoryQueryUrl(deps.apiOrigin, deps.allowHttp === true, filter, pageNumber, pageSize);
  if (!url) return { kind: 'error', reason: 'service' };

  const controller = new AbortController();
  const cancel = () => controller.abort();
  deps.signal?.addEventListener('abort', cancel, { once: true });
  const deadline = setTimeout(cancel, deps.timeoutMs ?? TIMEOUT_MS);
  const aborted = (): FetchHistoryListResult => (
    deps.signal?.aborted ? { kind: 'cancelled' } : { kind: 'error', reason: 'timeout' }
  );

  try {
    let response: Awaited<ReturnType<FetchHistoryListDeps['request']>>;
    try {
      response = await deps.request(url, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'omit',
        redirect: 'error',
        signal: controller.signal,
      });
    } catch {
      return controller.signal.aborted ? aborted() : { kind: 'error', reason: 'network' };
    }

    if (controller.signal.aborted) return aborted();
    if (response.status === 401) return { kind: 'unauthorized' };
    if (response.status !== 200) return { kind: 'error', reason: 'service' };

    const body: unknown = await response.json();
    if (controller.signal.aborted) return aborted();
    if (!body || typeof body !== 'object' || !Array.isArray((body as Record<string, unknown>).items)) {
      return { kind: 'error', reason: 'service' };
    }

    const record = body as Record<string, unknown>;
    const items = (record.items as unknown[])
      .map(parseHistoryItem)
      .filter((item): item is HistoryListItem => item !== null);
    const totalCount = typeof record.totalCount === 'number' ? record.totalCount : items.length;
    const hasMore = pageNumber * pageSize < totalCount;

    return { kind: 'loaded', items, pageNumber, totalCount, hasMore };
  } catch {
    return controller.signal.aborted ? aborted() : { kind: 'error', reason: 'service' };
  } finally {
    clearTimeout(deadline);
    deps.signal?.removeEventListener('abort', cancel);
  }
}

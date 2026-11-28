export interface RecentPredictionItem {
  id: string;
  plantName: string;
  diseaseName: string;
  confidence: number;
  createdAt: string;
}

export type FetchRecentPredictionsResult =
  | { kind: 'loaded'; items: RecentPredictionItem[] }
  | { kind: 'unauthorized' }
  | { kind: 'error'; reason: 'network' | 'timeout' | 'service' }
  | { kind: 'cancelled' };

export interface FetchRecentPredictionsDeps {
  readToken: () => Promise<string | null>;
  request: (url: string, init: RequestInit) => Promise<Pick<Response, 'status' | 'json'>>;
  apiOrigin: string | undefined;
  allowHttp?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RECENT_ITEMS = 3;

function predictionsEndpoint(apiOrigin: string | undefined, allowHttp: boolean): string | null {
  try {
    const url = new URL(apiOrigin ?? '');
    const supported = url.protocol === 'https:' || (allowHttp && url.protocol === 'http:');
    if (!supported || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      return null;
    }
    return `${url.origin}/api/predictions?pageNumber=1&pageSize=${MAX_RECENT_ITEMS}`;
  } catch {
    return null;
  }
}

function pickName(vietnamese: unknown, fallback: unknown, defaultLabel = ''): string {
  if (typeof vietnamese === 'string' && vietnamese.trim().length > 0) return vietnamese.trim();
  if (typeof fallback === 'string' && fallback.trim().length > 0) return fallback.trim();
  return defaultLabel;
}

function parseItem(raw: unknown): RecentPredictionItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || !record.id.trim()) return null;
  const confidence = typeof record.confidence === 'number' && Number.isFinite(record.confidence)
    ? record.confidence
    : 0;
  const createdAt = typeof record.createdAt === 'string' ? record.createdAt : '';
  return {
    id: record.id.trim(),
    plantName: pickName(record.plantVietnameseName, record.plantName),
    diseaseName: pickName(record.diseaseVietnameseName, record.diseaseName, 'Kết quả chẩn đoán'),
    confidence,
    createdAt,
  };
}

/** Fetches up to 3 recent predictions for an authenticated User; never called for Guest. */
export async function fetchRecentPredictions(
  deps: FetchRecentPredictionsDeps,
): Promise<FetchRecentPredictionsResult> {
  if (deps.signal?.aborted) return { kind: 'cancelled' };
  const token = await deps.readToken();
  if (!token) return { kind: 'unauthorized' };

  const url = predictionsEndpoint(deps.apiOrigin, deps.allowHttp === true);
  if (!url) return { kind: 'error', reason: 'service' };

  const controller = new AbortController();
  const cancel = () => controller.abort();
  deps.signal?.addEventListener('abort', cancel, { once: true });
  const deadline = setTimeout(cancel, deps.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const aborted = (): FetchRecentPredictionsResult => (
    deps.signal?.aborted ? { kind: 'cancelled' } : { kind: 'error', reason: 'timeout' }
  );

  try {
    let response: Awaited<ReturnType<FetchRecentPredictionsDeps['request']>>;
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

    const items = ((body as Record<string, unknown>).items as unknown[])
      .map(parseItem)
      .filter((item): item is RecentPredictionItem => item !== null)
      .slice(0, MAX_RECENT_ITEMS);

    return { kind: 'loaded', items };
  } catch {
    return controller.signal.aborted ? aborted() : { kind: 'error', reason: 'service' };
  } finally {
    clearTimeout(deadline);
    deps.signal?.removeEventListener('abort', cancel);
  }
}

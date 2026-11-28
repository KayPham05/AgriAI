export interface AgriculturalProfileItem {
  id: string;
  name: string;
  description: string | null;
  predictionCount: number;
  createdAt: string;
  updatedAt: string;
}

export type FetchProfilesResult =
  | { kind: 'loaded'; profiles: AgriculturalProfileItem[] }
  | { kind: 'unauthorized' }
  | { kind: 'error'; reason: 'network' | 'timeout' | 'service' }
  | { kind: 'cancelled' };

export interface ProfilesRequestDeps {
  readToken: () => Promise<string | null>;
  request: (url: string, init: RequestInit) => Promise<Pick<Response, 'status' | 'json'>>;
  apiOrigin: string | undefined;
  allowHttp?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const TIMEOUT_MS = 10_000;

export function profilesBaseUrl(apiOrigin: string | undefined, allowHttp: boolean): string | null {
  try {
    const url = new URL(apiOrigin ?? '');
    const supported = url.protocol === 'https:' || (allowHttp && url.protocol === 'http:');
    if (!supported || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      return null;
    }
    return `${url.origin}/api/agricultural-profiles`;
  } catch {
    return null;
  }
}

export function parseAgriculturalProfile(raw: unknown): AgriculturalProfileItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id.trim() || typeof r.name !== 'string' || !r.name.trim()) return null;
  return {
    id: r.id.trim(),
    name: r.name.trim(),
    description: typeof r.description === 'string' && r.description.trim() ? r.description.trim() : null,
    predictionCount: typeof r.predictionCount === 'number' && Number.isFinite(r.predictionCount) ? r.predictionCount : 0,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : '',
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : '',
  };
}

/** Fetches the authenticated owner's agricultural profiles (GET /api/agricultural-profiles). */
export async function fetchAgriculturalProfiles(deps: ProfilesRequestDeps): Promise<FetchProfilesResult> {
  if (deps.signal?.aborted) return { kind: 'cancelled' };
  const token = await deps.readToken();
  if (!token) return { kind: 'unauthorized' };

  const url = profilesBaseUrl(deps.apiOrigin, deps.allowHttp === true);
  if (!url) return { kind: 'error', reason: 'service' };

  const controller = new AbortController();
  const cancel = () => controller.abort();
  deps.signal?.addEventListener('abort', cancel, { once: true });
  const deadline = setTimeout(cancel, deps.timeoutMs ?? TIMEOUT_MS);
  const aborted = (): FetchProfilesResult => (
    deps.signal?.aborted ? { kind: 'cancelled' } : { kind: 'error', reason: 'timeout' }
  );

  try {
    let response: Awaited<ReturnType<ProfilesRequestDeps['request']>>;
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
    if (!Array.isArray(body)) return { kind: 'error', reason: 'service' };

    const profiles = body
      .map(parseAgriculturalProfile)
      .filter((item): item is AgriculturalProfileItem => item !== null);
    return { kind: 'loaded', profiles };
  } catch {
    return controller.signal.aborted ? aborted() : { kind: 'error', reason: 'service' };
  } finally {
    clearTimeout(deadline);
    deps.signal?.removeEventListener('abort', cancel);
  }
}

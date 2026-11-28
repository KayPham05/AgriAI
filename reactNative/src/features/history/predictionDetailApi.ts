import type { PredictionResult } from '@/features/diagnosis/submitPrediction';

export type FetchDetailResult =
  | { kind: 'loaded'; detail: PredictionResult }
  | { kind: 'not-found' }
  | { kind: 'unauthorized' }
  | { kind: 'error'; reason: 'network' | 'timeout' | 'service' }
  | { kind: 'cancelled' };

export type MutationResult =
  | { kind: 'ok' }
  | { kind: 'not-found' }
  | { kind: 'unauthorized' }
  | { kind: 'error'; reason: 'network' | 'timeout' | 'service' }
  | { kind: 'cancelled' };

export interface PredictionApiDeps {
  readToken: () => Promise<string | null>;
  request: (url: string, init: RequestInit) => Promise<Pick<Response, 'status' | 'json'>>;
  apiOrigin: string | undefined;
  allowHttp?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const TIMEOUT_MS = 10_000;

function predictionBase(apiOrigin: string | undefined, allowHttp: boolean): string | null {
  try {
    const url = new URL(apiOrigin ?? '');
    const supported = url.protocol === 'https:' || (allowHttp && url.protocol === 'http:');
    if (!supported || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      return null;
    }
    return `${url.origin}/api/predictions`;
  } catch {
    return null;
  }
}

async function runAuthorized(
  url: string,
  method: 'GET' | 'PUT' | 'DELETE',
  deps: PredictionApiDeps,
  bodyObj?: object,
): Promise<{ status: number; json?: unknown } | { failure: 'unauthorized' | 'network' | 'timeout' | 'service' | 'cancelled' }> {
  if (deps.signal?.aborted) return { failure: 'cancelled' };
  const token = await deps.readToken();
  if (!token) return { failure: 'unauthorized' };

  const controller = new AbortController();
  const cancel = () => controller.abort();
  deps.signal?.addEventListener('abort', cancel, { once: true });
  const deadline = setTimeout(cancel, deps.timeoutMs ?? TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { Accept: 'application/json', Authorization: `Bearer ${token}` };
    if (bodyObj) headers['Content-Type'] = 'application/json';
    let response: Awaited<ReturnType<PredictionApiDeps['request']>>;
    try {
      response = await deps.request(url, {
        method,
        headers,
        body: bodyObj ? JSON.stringify(bodyObj) : undefined,
        credentials: 'omit',
        redirect: 'error',
        signal: controller.signal,
      });
    } catch {
      return { failure: controller.signal.aborted ? (deps.signal?.aborted ? 'cancelled' : 'timeout') : 'network' };
    }
    if (controller.signal.aborted) return { failure: deps.signal?.aborted ? 'cancelled' : 'timeout' };
    if (response.status === 200) {
      const json: unknown = await response.json();
      return { status: 200, json };
    }
    return { status: response.status };
  } catch {
    return { failure: 'service' };
  } finally {
    clearTimeout(deadline);
    deps.signal?.removeEventListener('abort', cancel);
  }
}

export async function fetchPredictionDetail(id: string, deps: PredictionApiDeps): Promise<FetchDetailResult> {
  const base = predictionBase(deps.apiOrigin, deps.allowHttp === true);
  if (!base || !id.trim()) return { kind: 'not-found' };
  const res = await runAuthorized(`${base}/${encodeURIComponent(id.trim())}`, 'GET', deps);
  if ('failure' in res) {
    if (res.failure === 'cancelled') return { kind: 'cancelled' };
    if (res.failure === 'unauthorized') return { kind: 'unauthorized' };
    return { kind: 'error', reason: res.failure };
  }
  if (res.status === 401) return { kind: 'unauthorized' };
  if (res.status === 404) return { kind: 'not-found' };
  if (res.status !== 200 || !res.json || typeof res.json !== 'object') return { kind: 'error', reason: 'service' };
  return { kind: 'loaded', detail: res.json as PredictionResult };
}

function toMutationResult(
  res: Awaited<ReturnType<typeof runAuthorized>>,
): MutationResult {
  if ('failure' in res) {
    if (res.failure === 'cancelled') return { kind: 'cancelled' };
    if (res.failure === 'unauthorized') return { kind: 'unauthorized' };
    return { kind: 'error', reason: res.failure };
  }
  if (res.status === 401) return { kind: 'unauthorized' };
  if (res.status === 404) return { kind: 'not-found' };
  if (res.status === 204 || res.status === 200) return { kind: 'ok' };
  return { kind: 'error', reason: 'service' };
}

export async function assignPredictionProfile(
  predictionId: string,
  agriculturalProfileId: string,
  deps: PredictionApiDeps,
): Promise<MutationResult> {
  const base = predictionBase(deps.apiOrigin, deps.allowHttp === true);
  if (!base) return { kind: 'error', reason: 'service' };
  return toMutationResult(
    await runAuthorized(`${base}/${encodeURIComponent(predictionId)}/agricultural-profile`, 'PUT', deps, { agriculturalProfileId }),
  );
}

export async function removePredictionProfile(
  predictionId: string,
  profileId: string,
  deps: PredictionApiDeps,
): Promise<MutationResult> {
  const base = predictionBase(deps.apiOrigin, deps.allowHttp === true);
  if (!base) return { kind: 'error', reason: 'service' };
  return toMutationResult(
    await runAuthorized(`${base}/${encodeURIComponent(predictionId)}/agricultural-profile/${encodeURIComponent(profileId)}`, 'DELETE', deps),
  );
}

export async function deletePrediction(predictionId: string, deps: PredictionApiDeps): Promise<MutationResult> {
  const base = predictionBase(deps.apiOrigin, deps.allowHttp === true);
  if (!base) return { kind: 'error', reason: 'service' };
  return toMutationResult(
    await runAuthorized(`${base}/${encodeURIComponent(predictionId)}`, 'DELETE', deps),
  );
}

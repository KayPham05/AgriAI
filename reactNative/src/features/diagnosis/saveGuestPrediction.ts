export type SaveGuestPredictionResult =
  | { kind: 'saved' }
  | { kind: 'expired' }
  | { kind: 'unauthorized' }
  | { kind: 'error'; reason: 'network' | 'timeout' | 'service' }
  | { kind: 'cancelled' };

export interface SaveGuestPredictionDeps {
  guestToken: string;
  readToken: () => Promise<string | null>;
  request: (url: string, init: RequestInit) => Promise<Pick<Response, 'status' | 'json'>>;
  apiOrigin: string | undefined;
  allowHttp?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const TIMEOUT_MS = 10_000;

function saveGuestEndpoint(apiOrigin: string | undefined, allowHttp: boolean): string | null {
  try {
    const url = new URL(apiOrigin ?? '');
    const supported = url.protocol === 'https:' || (allowHttp && url.protocol === 'http:');
    if (!supported || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      return null;
    }
    return `${url.origin}/api/predictions/guest/save`;
  } catch {
    return null;
  }
}

/** Saves an existing guest prediction into the authenticated User's account without re-running inference. */
export async function saveGuestPrediction(deps: SaveGuestPredictionDeps): Promise<SaveGuestPredictionResult> {
  if (deps.signal?.aborted) return { kind: 'cancelled' };
  const token = await deps.readToken();
  if (!token) return { kind: 'unauthorized' };

  const url = saveGuestEndpoint(deps.apiOrigin, deps.allowHttp === true);
  if (!url) return { kind: 'error', reason: 'service' };

  const controller = new AbortController();
  const cancel = () => controller.abort();
  deps.signal?.addEventListener('abort', cancel, { once: true });
  const deadline = setTimeout(cancel, deps.timeoutMs ?? TIMEOUT_MS);
  const aborted = (): SaveGuestPredictionResult => (
    deps.signal?.aborted ? { kind: 'cancelled' } : { kind: 'error', reason: 'timeout' }
  );

  try {
    let response: Awaited<ReturnType<SaveGuestPredictionDeps['request']>>;
    try {
      response = await deps.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ guestToken: deps.guestToken }),
        credentials: 'omit',
        redirect: 'error',
        signal: controller.signal,
      });
    } catch {
      return controller.signal.aborted ? aborted() : { kind: 'error', reason: 'network' };
    }

    if (controller.signal.aborted) return aborted();
    if (response.status === 401) return { kind: 'unauthorized' };
    if (response.status === 400 || response.status === 404 || response.status === 410) return { kind: 'expired' };
    if (response.status === 200 || response.status === 201) return { kind: 'saved' };
    return { kind: 'error', reason: 'service' };
  } catch {
    return controller.signal.aborted ? aborted() : { kind: 'error', reason: 'service' };
  } finally {
    clearTimeout(deadline);
    deps.signal?.removeEventListener('abort', cancel);
  }
}

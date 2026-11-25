export type RestoredSession =
  | { status: 'guest' }
  | { status: 'user'; userId: string; fullName: string }
  | { status: 'unsupported-account' }
  | { status: 'retry'; reason: 'network' | 'timeout' | 'unavailable' };

type RestoreDependencies = {
  readToken: () => Promise<string | null>;
  clearToken: () => Promise<void>;
  request: (url: string, init: RequestInit) => Promise<Pick<Response, 'status' | 'json'>>;
  apiOrigin: string | undefined;
  allowHttp?: boolean;
  timeoutMs?: number;
};

const SESSION_CHECK_TIMEOUT_MS = 10_000;
const unavailable = { status: 'retry', reason: 'unavailable' } as const;
const timeout = { status: 'retry', reason: 'timeout' } as const;

function profileEndpoint(config: string | undefined, allowHttp: boolean): string {
  const url = new URL(config ?? '');
  const supportedScheme = url.protocol === 'https:' || (allowHttp && url.protocol === 'http:');
  if (!supportedScheme || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Invalid API origin');
  }
  return `${url.origin}/api/auth/me`;
}

export async function restoreSession(deps: RestoreDependencies): Promise<RestoredSession> {
  try {
    const token = await deps.readToken();
    if (!token) return { status: 'guest' };

    const url = profileEndpoint(deps.apiOrigin, deps.allowHttp === true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? SESSION_CHECK_TIMEOUT_MS);
    try {
      let response: Awaited<ReturnType<RestoreDependencies['request']>>;
      try {
        response = await deps.request(url, {
          method: 'GET',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
          credentials: 'omit',
          redirect: 'error',
          signal: controller.signal,
        });
      } catch {
        return controller.signal.aborted ? timeout : { status: 'retry', reason: 'network' };
      }
      if (controller.signal.aborted) return timeout;
      if (response.status === 401) {
        await deps.clearToken();
        return { status: 'guest' };
      }
      if (response.status !== 200) return unavailable;

      const profile: unknown = await response.json();
      if (controller.signal.aborted) return timeout;
      if (!profile || typeof profile !== 'object' || !('id' in profile) ||
          typeof profile.id !== 'string' || !profile.id.trim() || !('role' in profile)) {
        return unavailable;
      }
      if (profile.role === 'Admin') return { status: 'unsupported-account' };
      if (profile.role !== 'User' || !('fullName' in profile) ||
          typeof profile.fullName !== 'string' || !profile.fullName.trim()) {
        return unavailable;
      }
      return { status: 'user', userId: profile.id, fullName: profile.fullName.trim() };
    } catch {
      return controller.signal.aborted ? timeout : unavailable;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return unavailable;
  }
}

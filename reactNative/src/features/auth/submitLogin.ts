export type LoginCredentials = { email: string; password: string };
export type RegistrationCredentials = LoginCredentials & { fullName: string };
export type LoginFieldErrors = {
  fullName?: 'required' | 'too-long';
  email?: 'required' | 'format';
  password?: 'required' | 'too-short' | 'too-long';
};
export type LoginError =
  | 'credentials' | 'rate-limited' | 'service' | 'unsupported-account'
  | 'network' | 'timeout' | 'storage' | 'registration-rejected';
export type LoginResult =
  | { kind: 'invalid'; fields: LoginFieldErrors }
  | { kind: 'error'; error: LoginError }
  | { kind: 'otp-required'; challengeId: string }
  | { kind: 'authenticated'; userId: string; fullName: string }
  | { kind: 'cancelled' };

type LoginDependencies = {
  apiOrigin?: string;
  allowHttp?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  request: (url: string, init: RequestInit) => Promise<Pick<Response, 'status' | 'json'>>;
  saveToken: (token: string) => Promise<void>;
};

const LOGIN_TIMEOUT_MS = 10_000;
const MAX_PASSWORD_BYTES = 72;
const MAX_EMAIL_LENGTH = 254;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const serviceError = { kind: 'error', error: 'service' } as const;

function passwordBytes(password: string): number {
  let bytes = 0;
  for (const character of password) {
    const value = character.codePointAt(0) ?? 0;
    bytes += value <= 0x7f ? 1 : value <= 0x7ff ? 2 : value <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function getAuthOrigin(apiOrigin?: string, allowHttp = false): string | null {
  try {
    const url = new URL(apiOrigin ?? '');
    if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) return null;
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function submitLogin(credentials: LoginCredentials, deps: LoginDependencies): Promise<LoginResult> {
  return submitCredentials('login', credentials, deps);
}

export function submitRegistration(credentials: RegistrationCredentials, deps: LoginDependencies): Promise<LoginResult> {
  return submitCredentials('register', credentials, deps, credentials.fullName.trim());
}

async function submitCredentials(
  action: 'login' | 'register',
  credentials: LoginCredentials,
  deps: LoginDependencies,
  fullName?: string,
): Promise<LoginResult> {
  const email = credentials.email.trim().toLowerCase();
  const password = credentials.password;
  const fields: LoginFieldErrors = {};
  if (action === 'register') {
    if (!fullName) fields.fullName = 'required';
    else if (fullName.length > 100) fields.fullName = 'too-long';
  }
  if (!email) fields.email = 'required';
  else if (email.length > MAX_EMAIL_LENGTH || !emailPattern.test(email)) fields.email = 'format';
  if (!password.trim()) fields.password = 'required';
  else if (action === 'register' && password.length < 6) fields.password = 'too-short';
  else if (passwordBytes(password) > MAX_PASSWORD_BYTES) fields.password = 'too-long';
  if (fields.fullName || fields.email || fields.password) return { kind: 'invalid', fields };

  const origin = getAuthOrigin(deps.apiOrigin, deps.allowHttp);
  if (!origin) return serviceError;
  if (deps.signal?.aborted) return { kind: 'cancelled' };

  const controller = new AbortController();
  const cancel = () => controller.abort();
  deps.signal?.addEventListener('abort', cancel, { once: true });
  const deadline = setTimeout(cancel, deps.timeoutMs ?? LOGIN_TIMEOUT_MS);
  const aborted = (): LoginResult => deps.signal?.aborted
    ? { kind: 'cancelled' }
    : { kind: 'error', error: 'timeout' };

  let body: unknown;
  let status: number;
  try {
    let response: Awaited<ReturnType<LoginDependencies['request']>>;
    try {
      response = await deps.request(`${origin}/api/auth/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'omit',
        redirect: 'error',
        body: JSON.stringify({ email, password, fullName }),
        signal: controller.signal,
      });
    } catch {
      return controller.signal.aborted ? aborted() : { kind: 'error', error: 'network' };
    }
    if (controller.signal.aborted) return aborted();
    status = response.status;
    if (action === 'login' && status === 401) return { kind: 'error', error: 'credentials' };
    if (action === 'register' && (status === 400 || status === 409)) {
      return { kind: 'error', error: 'registration-rejected' };
    }
    if (status === 429) return { kind: 'error', error: 'rate-limited' };
    if (status !== 200 && !(action === 'login' && status === 202)) return serviceError;
    body = await response.json();
    if (controller.signal.aborted) return aborted();
  } catch {
    return controller.signal.aborted ? aborted() : serviceError;
  } finally {
    clearTimeout(deadline);
    deps.signal?.removeEventListener('abort', cancel);
  }

  if (!isRecord(body)) return serviceError;
  if (status === 202) {
    return isNonEmpty(body.challengeId)
      ? { kind: 'otp-required', challengeId: body.challengeId }
      : serviceError;
  }

  const { token, user } = body;
  if (!isRecord(user)) return serviceError;
  if (user.role === 'Admin') return { kind: 'error', error: 'unsupported-account' };
  if (user.role !== 'User' || !isNonEmpty(token) || !isNonEmpty(user.id) || !isNonEmpty(user.fullName)) {
    return serviceError;
  }
  if (deps.signal?.aborted) return { kind: 'cancelled' };

  try {
    await deps.saveToken(token);
  } catch {
    return { kind: 'error', error: 'storage' };
  }
  return { kind: 'authenticated', userId: user.id, fullName: user.fullName.trim() };
}

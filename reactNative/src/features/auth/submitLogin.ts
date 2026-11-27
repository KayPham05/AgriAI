export type LoginCredentials = { email: string; password: string };
export type RegistrationCredentials = LoginCredentials & { fullName: string };
export type LoginFieldErrors = {
  fullName?: 'required' | 'too-long';
  email?: 'required' | 'format';
  password?: 'required' | 'too-short' | 'too-long';
};
export type LoginError =
  | 'credentials' | 'login-locked' | 'rate-limited' | 'service' | 'unsupported-account'
  | 'network' | 'timeout' | 'storage' | 'registration-rejected';
export type LoginResult =
  | { kind: 'invalid'; fields: LoginFieldErrors }
  | { kind: 'error'; error: LoginError; retryAfterSeconds?: number }
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

type Authenticated = Extract<LoginResult, { kind: 'authenticated' }>;
type AuthFailure = Extract<LoginResult, { kind: 'error' | 'cancelled' }>;
type AuthRequestDependencies = Omit<LoginDependencies, 'saveToken'>;
type AuthAction = 'reset-password' | 'reset-password/verify' | 'forgot-password' | 'login' | 'register' | 'two-factor/login' | 'two-factor/login/resend';
type AuthResponse = { kind: 'response'; status: number; body?: unknown } | AuthFailure;
export type PasswordResetRequestResult = { kind: 'accepted'; email: string }
  | { kind: 'invalid'; fields: Pick<LoginFieldErrors, 'email'> } | AuthFailure;
export type RecoveryError = LoginError | 'invalid-code';
export type RecoveryFailure = { kind: 'error'; error: RecoveryError } | { kind: 'cancelled' };
export type VerifyPasswordResetResult = { kind: 'verified' } | RecoveryFailure;
export type NewPasswordValues = { code: string; password: string; confirmPassword: string };
export type ResetPasswordResult = { kind: 'reset' } | RecoveryFailure
  | { kind: 'invalid'; fields: { code?: 'format'; password?: LoginFieldErrors['password']; confirmPassword?: 'required' | 'mismatch' } };
export type OtpError = LoginError | 'invalid-code' | 'resend-rejected';
type OtpFailure = { kind: 'error'; error: OtpError } | { kind: 'cancelled' };
export type VerifyLoginOtpResult = Authenticated | OtpFailure;
export type ResendLoginOtpResult = { kind: 'resent'; challengeId: string } | OtpFailure;
export const loginOtpLength = 8;
const loginOtpPattern = /^[0-9]{8}$/;

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

export async function requestPasswordReset(
  rawEmail: string, deps: AuthRequestDependencies,
): Promise<PasswordResetRequestResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return { kind: 'invalid', fields: { email: 'required' } };
  if (email.length > MAX_EMAIL_LENGTH || !emailPattern.test(email)) {
    return { kind: 'invalid', fields: { email: 'format' } };
  }
  const response = await postAuth('forgot-password', { email }, deps);
  if (response.kind !== 'response') return response;
  if (response.status === 400) return { kind: 'invalid', fields: { email: 'format' } };
  return response.status === 202 ? { kind: 'accepted', email } : serviceError;
}

export async function verifyPasswordResetCode(code: string, deps: AuthRequestDependencies): Promise<VerifyPasswordResetResult> {
  if (!loginOtpPattern.test(code)) return { kind: 'error', error: 'invalid-code' };
  const result = await postAuth('reset-password/verify', { code }, deps);
  if (result.kind !== 'response') return result;
  if (result.status === 400) return { kind: 'error', error: 'invalid-code' };
  return result.status === 204 ? { kind: 'verified' } : serviceError;
}

export async function resetPassword(values: NewPasswordValues, deps: AuthRequestDependencies): Promise<ResetPasswordResult> {
  const { code, password, confirmPassword } = values;
  const fields: Extract<ResetPasswordResult, { kind: 'invalid' }>['fields'] = {};
  if (!loginOtpPattern.test(code)) fields.code = 'format';
  if (!password.trim()) fields.password = 'required';
  else if (password.length < 6) fields.password = 'too-short';
  else if (passwordBytes(password) > MAX_PASSWORD_BYTES) fields.password = 'too-long';
  if (!confirmPassword) fields.confirmPassword = 'required';
  else if (password !== confirmPassword) fields.confirmPassword = 'mismatch';
  if (fields.code || fields.password || fields.confirmPassword) return { kind: 'invalid', fields };
  const result = await postAuth('reset-password', { code, password }, deps);
  if (result.kind !== 'response') return result;
  if (result.status === 400) return { kind: 'error', error: 'invalid-code' };
  return result.status === 204 ? { kind: 'reset' } : serviceError;
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

  const response = await postAuth(action, { email, password, fullName }, deps);
  if (response.kind !== 'response') return response;
  if (action === 'login' && response.status === 401) return { kind: 'error', error: 'credentials' };
  if (action === 'register' && (response.status === 400 || response.status === 409)) {
    return { kind: 'error', error: 'registration-rejected' };
  }
  if (response.status === 202 && action === 'login' && isRecord(response.body) && isNonEmpty(response.body.challengeId)) {
    return { kind: 'otp-required', challengeId: response.body.challengeId };
  }
  return response.status === 200 ? saveAuthenticatedUser(response.body, deps) : serviceError;
}

export async function verifyLoginOtp(
  challengeId: string, code: string, deps: LoginDependencies,
): Promise<VerifyLoginOtpResult> {
  if (!isNonEmpty(challengeId) || !loginOtpPattern.test(code)) return { kind: 'error', error: 'invalid-code' };
  const response = await postAuth('two-factor/login', { challengeId, code }, deps);
  if (response.kind !== 'response') return response;
  if (response.status === 400) return { kind: 'error', error: 'invalid-code' };
  return response.status === 200 ? saveAuthenticatedUser(response.body, deps) : serviceError;
}

export async function resendLoginOtp(
  challengeId: string, deps: AuthRequestDependencies,
): Promise<ResendLoginOtpResult> {
  if (!isNonEmpty(challengeId)) return { kind: 'error', error: 'resend-rejected' };
  const response = await postAuth('two-factor/login/resend', { challengeId }, deps);
  if (response.kind !== 'response') return response;
  if (response.status === 400) return { kind: 'error', error: 'resend-rejected' };
  if (response.status !== 200 || !isRecord(response.body)) return serviceError;
  const next = response.body.challengeId;
  if (!isNonEmpty(next) || next.trim().toLowerCase() === challengeId.trim().toLowerCase()) return serviceError;
  return { kind: 'resent', challengeId: next };
}

async function postAuth(
  action: AuthAction, payload: object, deps: AuthRequestDependencies,
): Promise<AuthResponse> {
  const origin = getAuthOrigin(deps.apiOrigin, deps.allowHttp);
  if (!origin) return serviceError;
  if (deps.signal?.aborted) return { kind: 'cancelled' };

  const controller = new AbortController();
  const cancel = () => controller.abort();
  deps.signal?.addEventListener('abort', cancel, { once: true });
  const deadline = setTimeout(cancel, deps.timeoutMs ?? LOGIN_TIMEOUT_MS);
  const aborted = (): AuthFailure => deps.signal?.aborted
    ? { kind: 'cancelled' }
    : { kind: 'error', error: 'timeout' };

  try {
    let response: Awaited<ReturnType<LoginDependencies['request']>>;
    try {
      response = await deps.request(`${origin}/api/auth/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'omit',
        redirect: 'error',
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch {
      return controller.signal.aborted ? aborted() : { kind: 'error', error: 'network' };
    }
    if (controller.signal.aborted) return aborted();
    const status = response.status;
    if (status === 429) {
      try {
        const body: unknown = await response.json();
        if (controller.signal.aborted) return aborted();
        if (isRecord(body) && body.code === 'LOGIN_LOCKED' && typeof body.retryAfterSeconds === 'number'
          && Number.isSafeInteger(body.retryAfterSeconds) && body.retryAfterSeconds > 0) {
          return { kind: 'error', error: 'login-locked', retryAfterSeconds: body.retryAfterSeconds };
        }
      } catch { if (controller.signal.aborted) return aborted(); }
      return { kind: 'error', error: 'rate-limited' };
    }
    if (status !== 200 && !(action === 'login' && status === 202)) return { kind: 'response', status };
    const body: unknown = await response.json();
    if (controller.signal.aborted) return aborted();
    return { kind: 'response', status, body };
  } catch {
    return controller.signal.aborted ? aborted() : serviceError;
  } finally {
    clearTimeout(deadline);
    deps.signal?.removeEventListener('abort', cancel);
  }
}

async function saveAuthenticatedUser(body: unknown, deps: LoginDependencies): Promise<Authenticated | AuthFailure> {
  if (!isRecord(body)) return serviceError;
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

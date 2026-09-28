export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  fullName: string;
}

const AUTH_STORAGE_KEY = 'leafai_auth_session';
const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';

function getErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;

  const response = body as { message?: unknown; errors?: Array<{ error?: unknown }> };
  if (response.message === 'Invalid email or password.') {
    return 'Email hoặc mật khẩu không chính xác.';
  }
  if (typeof response.message === 'string' && response.message.includes('already exists')) {
    return 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc chọn email khác.';
  }
  if (Array.isArray(response.errors) && typeof response.errors[0]?.error === 'string') {
    return response.errors[0].error;
  }
  return typeof response.message === 'string' ? response.message : fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${configuredBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new Error('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.');
  }

  const body = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    throw new Error(getErrorMessage(body, 'Yêu cầu chưa thể hoàn tất. Vui lòng thử lại.'));
  }

  return body as T;
}

export function login(credentials: LoginCredentials): Promise<AuthSession> {
  return request<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function register(credentials: RegisterCredentials): Promise<AuthSession> {
  return request<AuthSession>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function saveAuthSession(session: AuthSession, remember: boolean): void {
  clearAuthSession();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function restoreAuthSession(): Promise<AuthSession | null> {
  const serialized = localStorage.getItem(AUTH_STORAGE_KEY) ?? sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!serialized) return null;

  try {
    const session = JSON.parse(serialized) as AuthSession;
    if (!session.token) throw new Error('Missing token');

    const user = await request<AuthUser>('/api/auth/me', {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    return { token: session.token, user };
  } catch {
    clearAuthSession();
    return null;
  }
}

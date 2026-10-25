import type { AuthUser } from '@/services/authApi';

export interface UserProfileDto extends AuthUser {
  isActive: boolean;
  updatedAt: string | null;
  emailVerifiedAt: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export class UserApiError extends Error {
  constructor(
    public readonly status: number,
    message?: string,
  ) {
    super(
      status === 401
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : status === 400 && message
          ? message
          : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.',
    );
    this.name = 'UserApiError';
  }
}

const baseUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? ''}/api/users`;

async function request<T>(
  token: string,
  path: string,
  method: string,
  body?: object | FormData,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      signal,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new UserApiError(0);
  }
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null);
    const message =
      error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : undefined;
    throw new UserApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getUserProfile(token: string, signal?: AbortSignal) {
  return request<UserProfileDto>(token, '/profile', 'GET', undefined, signal);
}

export function updateUserProfile(token: string, fullName: string, signal?: AbortSignal) {
  return request<UserProfileDto>(token, '/profile', 'PUT', { fullName: fullName.trim() }, signal);
}

export function changePassword(token: string, input: ChangePasswordInput, signal?: AbortSignal) {
  return request<void>(token, '/change-password', 'POST', input, signal);
}

export function uploadUserAvatar(token: string, file: File, signal?: AbortSignal) {
  const form = new FormData();
  form.append('file', file);
  return request<UserProfileDto>(token, '/avatar', 'POST', form, signal);
}

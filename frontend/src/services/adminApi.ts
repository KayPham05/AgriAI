import type { AuthUser } from './authApi';

export interface AdminSummary {
  userCount: number;
  imageCount: number;
  sessionCount: number;
}
export interface AdminDailyActivity {
  date: string;
  userCount: number;
  imageCount: number;
  sessionCount: number;
}
export interface AdminActivity {
  timeZone: string;
  days: AdminDailyActivity[];
}
export interface AdminPage<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
export interface AdminImage {
  id: string;
  predictionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  imageUrl: string | null;
  uploadedAt: string;
  expiresAt: string;
  status: 'Available' | 'Expired' | 'Deleted';
}
export interface AdminSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  expiresAt: string;
  endedAt: string | null;
  status: 'Active' | 'Expired' | 'Ended';
}
export interface AdminUser extends AuthUser {
  isLocked: boolean;
  lockedAt: string | null;
  lockReason: string | null;
  warningCount: number;
}
export class AdminApiError extends Error {
  constructor(public readonly status: number) {
    super(
      status === 401
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : status === 403
          ? 'Tài khoản này không có quyền Admin.'
          : 'Không thể tải dữ liệu quản trị. Vui lòng thử lại.',
    );
  }
}
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';

async function request<T>(path: string, token: string, signal: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/admin/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new AdminApiError(0);
  }
  if (!response.ok) throw new AdminApiError(response.status);
  return response.json() as Promise<T>;
}
export function getAdminSummary(token: string, signal: AbortSignal): Promise<AdminSummary> {
  return request('summary', token, signal);
}
export function getAdminActivity(token: string, signal: AbortSignal): Promise<AdminActivity> {
  return request('activity', token, signal);
}
export function getAdminPage<T>(
  resource: 'users' | 'images' | 'sessions',
  token: string,
  page: number,
  q: string,
  signal: AbortSignal,
): Promise<AdminPage<T>> {
  const query = new URLSearchParams({ pageNumber: String(page), pageSize: '10' });
  if (q.trim()) query.set('q', q.trim());
  return request(`${resource}?${query}`, token, signal);
}

export async function moderateAccount(
  token: string,
  id: string,
  action: 'lock' | 'restore' | 'logout-all' | 'warnings',
  message: string,
): Promise<void> {
  const lock = action === 'lock' || action === 'restore';
  await mutate(
    `users/${encodeURIComponent(id)}/${lock ? 'lock' : action}`,
    token,
    lock ? 'PUT' : 'POST',
    lock
      ? { isLocked: action === 'lock', reason: message }
      : action === 'warnings'
        ? { message }
        : undefined,
  );
}

export function moderateImage(
  token: string,
  id: string,
  action: 'delete' | 'warnings',
  message: string,
): Promise<void> {
  return mutate(
    `images/${encodeURIComponent(id)}${action === 'warnings' ? '/warnings' : ''}`,
    token,
    action === 'delete' ? 'DELETE' : 'POST',
    action === 'warnings' ? { message } : undefined,
  );
}

async function mutate(path: string, token: string, method: string, body?: unknown): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/admin/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Không thể kết nối máy chủ. Vui lòng thử lại.');
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      throw new AdminApiError(response.status);
    throw new Error('Thao tác chưa hoàn tất. Vui lòng tải lại dữ liệu và thử lại.');
  }
}

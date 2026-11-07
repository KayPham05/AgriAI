import { sessionFetch } from './sessionFetch';
import { catalogRequest, type CatalogPage } from './knowledgeApi';
import type { AuthUser } from './authApi';

export interface ManagedAdminUser extends AuthUser {
  isActive: boolean;
  lockReason?: string | null;
  lockedAt?: string | null;
  predictionCount: number;
}

export function readAdminPage<T>(
  resource: 'users' | 'images' | 'sessions',
  token: string,
  page: number,
  search: string,
  signal: AbortSignal,
) {
  const query = new URLSearchParams({
    pageNumber: String(page),
    pageSize: '10',
    search: search.trim(),
  });
  return catalogRequest<CatalogPage<T>>(`/api/admin/${resource}?${query}`, { token, signal });
}

export function moderateAccount(
  token: string,
  id: string,
  action: 'lock' | 'restore' | 'logout-all' | 'warnings',
  message: string,
) {
  if (action === 'lock' || action === 'restore')
    return catalogRequest(`/api/admin/users/${id}/status`, {
      token,
      method: 'PUT',
      body: { isActive: action === 'restore', reason: action === 'lock' ? message : null },
    });
  return catalogRequest(`/api/admin/users/${id}/${action}`, {
    token,
    method: 'POST',
    ...(action === 'warnings' ? { body: { message } } : {}),
  });
}

export function moderateImage(
  token: string,
  id: string,
  action: 'delete' | 'warnings',
  message: string,
) {
  return catalogRequest(`/api/admin/images/${id}${action === 'warnings' ? '/warnings' : ''}`, {
    token,
    method: action === 'delete' ? 'DELETE' : 'POST',
    ...(action === 'warnings' ? { body: { message } } : {}),
  });
}

export async function readAdminImage(
  id: string,
  token: string,
  signal: AbortSignal,
): Promise<Blob> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
  const response = await sessionFetch(`${base}/api/admin/images/${id}/content`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Không thể tải ảnh.');
  return response.blob();
}

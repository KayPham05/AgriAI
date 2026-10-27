export interface AgriculturalProfile {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
  predictionCount: number;
}

export interface AgriculturalProfileInput {
  name: string;
  description: string | null;
}

const profilesUrl = '/api/agricultural-profiles';

function getErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const message =
      (body as { message?: unknown; detail?: unknown }).message ??
      (body as { detail?: unknown }).detail;
    if (typeof message === 'string') return message;
  }
  return `Backend trả về lỗi ${status}.`;
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${profilesUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const body = response.status === 204
    ? null
    : typeof response.json === 'function'
      ? ((await response.json().catch(() => null)) as unknown)
      : null;
  if (!response.ok) throw new Error(getErrorMessage(body, response.status));
  return body as T;
}

export function getAgriculturalProfiles(token: string): Promise<AgriculturalProfile[]> {
  return request<AgriculturalProfile[]>('', token);
}

export function getAgriculturalProfile(id: string, token: string): Promise<AgriculturalProfile> {
  return request<AgriculturalProfile>(`/${id}`, token);
}

export function createAgriculturalProfile(
  token: string,
  input: AgriculturalProfileInput,
): Promise<AgriculturalProfile> {
  return request<AgriculturalProfile>('', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAgriculturalProfile(
  id: string,
  token: string,
  input: AgriculturalProfileInput,
): Promise<AgriculturalProfile> {
  return request<AgriculturalProfile>(`/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteAgriculturalProfile(id: string, token: string): Promise<void> {
  await request<unknown>(`/${id}`, token, { method: 'DELETE' });
}

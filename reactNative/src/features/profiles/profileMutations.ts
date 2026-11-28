import {
  parseAgriculturalProfile,
  profilesBaseUrl,
  type AgriculturalProfileItem,
  type ProfilesRequestDeps,
} from '@/features/profiles/fetchAgriculturalProfiles';

export const MAX_PROFILE_NAME_LENGTH = 150;

export interface ProfilePayload {
  name: string;
  description: string | null;
}

export type ProfileValidationResult =
  | { valid: true; payload: ProfilePayload }
  | { valid: false; nameError: string };

export type FetchProfileDetailResult =
  | { kind: 'loaded'; profile: AgriculturalProfileItem }
  | { kind: 'not-found' }
  | { kind: 'unauthorized' }
  | { kind: 'error'; reason: 'network' | 'timeout' | 'service' }
  | { kind: 'cancelled' };

export type SaveProfileResult =
  | { kind: 'saved'; profile: AgriculturalProfileItem }
  | { kind: 'not-found' }
  | { kind: 'unauthorized' }
  | { kind: 'error'; reason: 'network' | 'timeout' | 'service' }
  | { kind: 'cancelled' };

export type DeleteProfileResult =
  | { kind: 'deleted' }
  | { kind: 'not-found' }
  | { kind: 'unauthorized' }
  | { kind: 'error'; reason: 'network' | 'timeout' | 'service' }
  | { kind: 'cancelled' };

const TIMEOUT_MS = 10_000;

export function validateProfileForm(rawName: string, rawDescription: string): ProfileValidationResult {
  const name = rawName.trim();
  if (!name) return { valid: false, nameError: 'Vui lòng nhập tên hồ sơ.' };
  if (name.length > MAX_PROFILE_NAME_LENGTH) {
    return { valid: false, nameError: `Tên hồ sơ tối đa ${MAX_PROFILE_NAME_LENGTH} ký tự.` };
  }
  const trimmedDesc = rawDescription.trim();
  return { valid: true, payload: { name, description: trimmedDesc ? trimmedDesc : null } };
}

async function sendProfileRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  deps: ProfilesRequestDeps,
  payload?: ProfilePayload,
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
    if (payload) headers['Content-Type'] = 'application/json';
    let response: Awaited<ReturnType<ProfilesRequestDeps['request']>>;
    try {
      response = await deps.request(url, {
        method,
        headers,
        body: payload ? JSON.stringify(payload) : undefined,
        credentials: 'omit',
        redirect: 'error',
        signal: controller.signal,
      });
    } catch {
      return { failure: controller.signal.aborted ? (deps.signal?.aborted ? 'cancelled' : 'timeout') : 'network' };
    }
    if (controller.signal.aborted) return { failure: deps.signal?.aborted ? 'cancelled' : 'timeout' };
    if (response.status === 200 || response.status === 201) {
      const json: unknown = await response.json();
      return { status: response.status, json };
    }
    return { status: response.status };
  } catch {
    return { failure: 'service' };
  } finally {
    clearTimeout(deadline);
    deps.signal?.removeEventListener('abort', cancel);
  }
}

export async function fetchAgriculturalProfileById(
  id: string,
  deps: ProfilesRequestDeps,
): Promise<FetchProfileDetailResult> {
  const base = profilesBaseUrl(deps.apiOrigin, deps.allowHttp === true);
  if (!base || !id.trim()) return { kind: 'not-found' };
  const res = await sendProfileRequest(`${base}/${encodeURIComponent(id.trim())}`, 'GET', deps);
  if ('failure' in res) {
    if (res.failure === 'cancelled') return { kind: 'cancelled' };
    if (res.failure === 'unauthorized') return { kind: 'unauthorized' };
    return { kind: 'error', reason: res.failure };
  }
  if (res.status === 401) return { kind: 'unauthorized' };
  if (res.status === 404) return { kind: 'not-found' };
  const profile = parseAgriculturalProfile(res.json);
  return profile ? { kind: 'loaded', profile } : { kind: 'error', reason: 'service' };
}

export async function createAgriculturalProfile(
  payload: ProfilePayload,
  deps: ProfilesRequestDeps,
): Promise<SaveProfileResult> {
  const base = profilesBaseUrl(deps.apiOrigin, deps.allowHttp === true);
  if (!base) return { kind: 'error', reason: 'service' };
  const res = await sendProfileRequest(base, 'POST', deps, payload);
  if ('failure' in res) {
    if (res.failure === 'cancelled') return { kind: 'cancelled' };
    if (res.failure === 'unauthorized') return { kind: 'unauthorized' };
    return { kind: 'error', reason: res.failure };
  }
  if (res.status === 401) return { kind: 'unauthorized' };
  const profile = parseAgriculturalProfile(res.json);
  return (res.status === 201 || res.status === 200) && profile
    ? { kind: 'saved', profile }
    : { kind: 'error', reason: 'service' };
}

export async function updateAgriculturalProfile(
  id: string,
  payload: ProfilePayload,
  deps: ProfilesRequestDeps,
): Promise<SaveProfileResult> {
  const base = profilesBaseUrl(deps.apiOrigin, deps.allowHttp === true);
  if (!base || !id.trim()) return { kind: 'not-found' };
  const res = await sendProfileRequest(`${base}/${encodeURIComponent(id.trim())}`, 'PUT', deps, payload);
  if ('failure' in res) {
    if (res.failure === 'cancelled') return { kind: 'cancelled' };
    if (res.failure === 'unauthorized') return { kind: 'unauthorized' };
    return { kind: 'error', reason: res.failure };
  }
  if (res.status === 401) return { kind: 'unauthorized' };
  if (res.status === 404) return { kind: 'not-found' };
  const profile = parseAgriculturalProfile(res.json);
  return res.status === 200 && profile
    ? { kind: 'saved', profile }
    : { kind: 'error', reason: 'service' };
}

export async function deleteAgriculturalProfile(
  id: string,
  deps: ProfilesRequestDeps,
): Promise<DeleteProfileResult> {
  const base = profilesBaseUrl(deps.apiOrigin, deps.allowHttp === true);
  if (!base || !id.trim()) return { kind: 'not-found' };
  const res = await sendProfileRequest(`${base}/${encodeURIComponent(id.trim())}`, 'DELETE', deps);
  if ('failure' in res) {
    if (res.failure === 'cancelled') return { kind: 'cancelled' };
    if (res.failure === 'unauthorized') return { kind: 'unauthorized' };
    return { kind: 'error', reason: res.failure };
  }
  if (res.status === 401) return { kind: 'unauthorized' };
  if (res.status === 404) return { kind: 'not-found' };
  return res.status === 204 || res.status === 200 ? { kind: 'deleted' } : { kind: 'error', reason: 'service' };
}

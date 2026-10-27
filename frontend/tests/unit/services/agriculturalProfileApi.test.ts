import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAgriculturalProfile,
  deleteAgriculturalProfile,
  getAgriculturalProfile,
  getAgriculturalProfiles,
  updateAgriculturalProfile,
} from '@/services/agriculturalProfileApi';

const profile = {
  id: 'profile-1',
  userId: 'user-1',
  name: 'Vườn nhà',
  description: 'Đất phù sa',
  createdAt: '2026-10-21T10:00:00Z',
  updatedAt: null,
  predictionCount: 2,
};

afterEach(() => vi.unstubAllGlobals());

describe('agricultural profile API', () => {
  it('loads profiles with the authenticated owner token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [profile] });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getAgriculturalProfiles('jwt-token')).resolves.toEqual([profile]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/agricultural-profiles',
      expect.objectContaining({ headers: { Authorization: 'Bearer jwt-token' } }),
    );
  });

  it('creates and updates a profile with JSON request bodies', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => profile })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...profile, name: 'Vườn mới' }) });
    vi.stubGlobal('fetch', fetchMock);

    await createAgriculturalProfile('jwt-token', { name: 'Vườn nhà', description: 'Đất phù sa' });
    await updateAgriculturalProfile('profile-1', 'jwt-token', {
      name: 'Vườn mới',
      description: null,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/agricultural-profiles',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Vườn nhà', description: 'Đất phù sa' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/agricultural-profiles/profile-1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Vườn mới', description: null }),
      }),
    );
  });

  it('loads a detail and deletes it with the authenticated token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => profile })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await getAgriculturalProfile('profile-1', 'jwt-token');
    await deleteAgriculturalProfile('profile-1', 'jwt-token');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/agricultural-profiles/profile-1',
      expect.objectContaining({ headers: { Authorization: 'Bearer jwt-token' } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/agricultural-profiles/profile-1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer jwt-token' },
    });
  });

  it('surfaces the backend error when a request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Agricultural profile not found.' }),
      }),
    );

    await expect(getAgriculturalProfile('missing', 'jwt-token')).rejects.toThrow(
      'Agricultural profile not found.',
    );
  });
});

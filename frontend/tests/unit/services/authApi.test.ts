import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearAuthSession,
  login,
  register,
  revokeSession,
  restoreAuthSession,
  saveAuthSession,
  updateStoredAuthUser,
} from '@/services/authApi';

const user = {
  id: 'user-one',
  fullName: 'Nguyen An',
  email: 'an@example.test',
  role: 'User',
  createdAt: '2026-09-27T10:00:00Z',
};
const session = { token: 'jwt-token', user };

describe('authentication API', () => {
  it.each([true, false])(
    'updates the same saved identity while preserving remember=%s',
    (remember) => {
      saveAuthSession(session, remember);
      updateStoredAuthUser({ ...user, fullName: 'Tên đã lưu' });
      const storage = remember ? localStorage : sessionStorage;
      expect(JSON.parse(storage.getItem('leafai_auth_session') ?? '{}')).toMatchObject({
        token: session.token,
        user: { fullName: 'Tên đã lưu' },
      });
      expect((remember ? sessionStorage : localStorage).getItem('leafai_auth_session')).toBeNull();
    },
  );
  afterEach(() => {
    vi.unstubAllGlobals();
    clearAuthSession();
  });

  it('posts login credentials and returns the session', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => session });
    vi.stubGlobal('fetch', fetchMock);

    await expect(login({ email: user.email, password: 'secret' })).resolves.toEqual(session);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: user.email, password: 'secret' }),
      }),
    );
  });

  it('explains authentication and registration errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: 'Invalid email or password.' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: 'Email already exists.' }),
        }),
    );

    await expect(login({ email: user.email, password: 'wrong' })).rejects.toThrow(
      'không chính xác',
    );
    await expect(register({ ...user, password: 'secret' })).rejects.toThrow('đã được sử dụng');
  });

  it('reports a network error without exposing fetch internals', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(login({ email: user.email, password: 'secret' })).rejects.toThrow(
      'Không thể kết nối máy chủ',
    );
  });

  it('restores a saved session with the server user and clears an invalid token', async () => {
    saveAuthSession(session, true);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => user })
        .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Unauthorized' }) }),
    );

    await expect(restoreAuthSession()).resolves.toEqual(session);
    await expect(restoreAuthSession()).resolves.toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('keeps a session only for the current tab when remember is false', async () => {
    saveAuthSession(session, false);

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.getItem('leafai_auth_session')).toContain('jwt-token');
  });
});

it('revokes only the current bearer session and accepts an already expired session', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, status: 204 })
    .mockResolvedValueOnce({ ok: false, status: 401 });
  vi.stubGlobal('fetch', fetchMock);
  await expect(revokeSession('current')).resolves.toBeUndefined();
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/auth/logout',
    expect.objectContaining({
      method: 'POST',
      headers: { Authorization: 'Bearer current' },
      signal: expect.any(AbortSignal),
    }),
  );
  await expect(revokeSession('expired')).resolves.toBeUndefined();
});

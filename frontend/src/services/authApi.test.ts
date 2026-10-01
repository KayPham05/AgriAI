import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAuthSession, login, register, restoreAuthSession, saveAuthSession } from './authApi';

const user = {
  id: 'user-one', fullName: 'Nguyen An', email: 'an@example.test', role: 'User',
  createdAt: '2026-09-27T10:00:00Z',
};
const session = { token: 'jwt-token', user };

describe('authentication API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearAuthSession();
  });

  it('posts login credentials and returns the session', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => session });
    vi.stubGlobal('fetch', fetchMock);

    await expect(login({ email: user.email, password: 'secret' })).resolves.toEqual(session);
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ email: user.email, password: 'secret' }),
    }));
  });

  it('explains authentication and registration errors', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Invalid email or password.' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Email already exists.' }) }));

    await expect(login({ email: user.email, password: 'wrong' })).rejects.toThrow('không chính xác');
    await expect(register({ ...user, password: 'secret' })).rejects.toThrow('đã được sử dụng');
  });

  it('reports a network error without exposing fetch internals', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(login({ email: user.email, password: 'secret' })).rejects.toThrow('Không thể kết nối máy chủ');
  });

  it('restores a saved session with the server user and clears an invalid token', async () => {
    saveAuthSession(session, true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => user })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Unauthorized' }) }));

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

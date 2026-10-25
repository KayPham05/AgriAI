import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  changePassword,
  getUserProfile,
  updateUserProfile,
  uploadUserAvatar,
} from '@/services/userApi';

afterEach(() => vi.unstubAllGlobals());
describe('user API mapping', () => {
  it('uploads a file with authorization and browser-generated multipart headers', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ avatarUrl: '/api/users/avatar/example' }),
      });
    vi.stubGlobal('fetch', fetcher);
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    await uploadUserAvatar('token', file);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('/api/users/avatar');
    expect(options.headers).toEqual({ Authorization: 'Bearer token' });
    expect(options.body.get('file').name).toBe(file.name);
    expect(options.body.get('file').size).toBe(file.size);
  });
  it('reads and updates the authenticated profile with only fullName', async () => {
    const dto = { id: 'owner', fullName: 'Tên mới' };
    const request = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => dto });
    vi.stubGlobal('fetch', request);
    await expect(getUserProfile('token')).resolves.toEqual(dto);
    expect(request).toHaveBeenLastCalledWith(
      '/api/users/profile',
      expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
    );
    await updateUserProfile('token', '  Tên mới  ');
    expect(request).toHaveBeenLastCalledWith(
      '/api/users/profile',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ fullName: 'Tên mới' }) }),
    );
  });
  it('posts password fields unchanged and handles 204 without parsing JSON', async () => {
    const json = vi.fn();
    const request = vi.fn().mockResolvedValue({ ok: true, status: 204, json });
    vi.stubGlobal('fetch', request);
    const input = {
      currentPassword: ' old password ',
      newPassword: ' new password ',
      confirmPassword: ' new password ',
    };
    await expect(changePassword('token', input)).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith(
      '/api/users/change-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      }),
    );
    expect(json).not.toHaveBeenCalled();
  });
  it.each([400, 401, 500])('preserves HTTP %s for form and session handling', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: async () => ({ message: 'Mật khẩu hiện tại không chính xác.' }),
      }),
    );
    await expect(
      changePassword('token', {
        currentPassword: 'old',
        newPassword: 'newpass',
        confirmPassword: 'newpass',
      }),
    ).rejects.toMatchObject({ status });
  });
});

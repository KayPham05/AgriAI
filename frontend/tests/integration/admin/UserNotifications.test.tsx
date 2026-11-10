import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useUserNotifications } from '@/providers/useUserNotifications';
import { json } from '../../helpers/knowledge';

it('shows account restoration as a success notice after signing in', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      json({
        items: [
          {
            id: 'restored',
            kind: 'AccountRestored',
            message: 'Tài khoản đã được khôi phục.',
            createdAt: '2026-11-05T00:00:00Z',
            readAt: null,
          },
        ],
        totalPages: 1,
      }),
    ),
  );
  const { result } = renderHook(() => useUserNotifications('restored-owner', true));
  await waitFor(() => expect(result.current.notifications).toHaveLength(1));
  expect(result.current.notifications[0]).toMatchObject({
    title: 'Tài khoản đã được khôi phục',
    type: 'success',
    read: false,
  });
});

it('loads private warnings, persists read/dismiss actions and clears them on account change', async () => {
  let read = false;
  let dismissed = false;
  const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      read = true;
      return new Response(null, { status: 204 });
    }
    if (init?.method === 'DELETE') {
      dismissed = true;
      return new Response(null, { status: 204 });
    }
    return json({
      items: dismissed
        ? []
        : [
            {
              id: 'notice',
              message: 'Please upload a leaf photo',
              imageId: 'image',
              createdAt: '2026-11-04T00:00:00Z',
              readAt: read ? '2026-11-04T01:00:00Z' : null,
            },
          ],
      pageNumber: 1,
      totalPages: dismissed ? 0 : 1,
    });
  });
  vi.stubGlobal('fetch', fetch);
  const { result, rerender } = renderHook(({ token, open }) => useUserNotifications(token, open), {
    initialProps: { token: 'owner', open: true },
  });
  await waitFor(() => expect(result.current.notifications).toHaveLength(1));
  expect(result.current.notifications[0]).toMatchObject({
    description: 'Please upload a leaf photo',
    read: false,
    type: 'warning',
  });
  await act(() => result.current.markAllRead());
  await waitFor(() => expect(result.current.notifications[0].read).toBe(true));
  await act(() => result.current.clearAll());
  await waitFor(() => expect(result.current.notifications).toHaveLength(0));
  expect(fetch).toHaveBeenCalledWith(
    '/api/users/notifications/read',
    expect.objectContaining({ method: 'PUT', headers: { Authorization: 'Bearer owner' } }),
  );
  rerender({ token: 'another-account', open: false });
  expect(result.current.notifications).toHaveLength(0);
});

it('keeps notifications visible and reports failed dismissals instead of pretending success', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? json({ message: 'Cannot dismiss now' }, 500)
        : json({
            items: [{ id: 'notice', message: 'Warning', createdAt: '2026-11-04', readAt: null }],
            totalPages: 1,
          }),
    ),
  );
  const { result, rerender } = renderHook(({ token }) => useUserNotifications(token, true), {
    initialProps: { token: 'owner' },
  });
  await waitFor(() => expect(result.current.notifications).toHaveLength(1));
  await act(() => result.current.clearAll());
  expect(result.current.error).toBe('Cannot dismiss now');
  expect(result.current.notifications).toHaveLength(1);
  rerender({ token: '' });
  expect(result.current.notifications).toHaveLength(0);
});

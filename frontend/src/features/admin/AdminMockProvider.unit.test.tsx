import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminMockProvider, useAdminMock } from './AdminMockProvider';

afterEach(() => vi.useRealTimers());

describe('Admin mock state', () => {
  it('locks only the selected account and ends its active session', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T05:00:00Z'));
    const { result } = renderHook(useAdminMock, { wrapper: AdminMockProvider });
    act(() => result.current.moderateAccount('mock-user-1', 'lock', 'Kiểm tra'));
    expect(result.current.users[0]).toMatchObject({
      isLocked: true,
      lockedAt: '2026-10-16T05:00:00.000Z',
      lockReason: 'Kiểm tra',
    });
    expect(result.current.users[1].isLocked).toBe(false);
    expect(result.current.sessions[0]).toMatchObject({
      status: 'Ended',
      endedAt: '2026-10-16T05:00:00.000Z',
    });
    expect(result.current.sessions[2].status).toBe('Expired');
  });

  it('restores an account without reactivating its ended session', () => {
    const { result } = renderHook(useAdminMock, { wrapper: AdminMockProvider });
    act(() => result.current.moderateAccount('mock-user-1', 'lock', 'Kiểm tra'));
    act(() => result.current.moderateAccount('mock-user-1', 'restore', ''));
    expect(result.current.users[0]).toMatchObject({
      isLocked: false,
      lockedAt: null,
      lockReason: null,
    });
    expect(result.current.sessions[0].status).toBe('Ended');
  });

  it('ends sessions without locking the account', () => {
    const { result } = renderHook(useAdminMock, { wrapper: AdminMockProvider });
    act(() => result.current.moderateAccount('mock-user-1', 'logout-all', ''));
    expect(result.current.sessions[0].status).toBe('Ended');
    expect(result.current.users[0].isLocked).toBe(false);
    expect(result.current.sessions[1].status).toBe('Ended');
    expect(result.current.sessions[2].status).toBe('Expired');
  });

  it('accumulates account and image warnings only for their owner', () => {
    const { result } = renderHook(useAdminMock, { wrapper: AdminMockProvider });
    act(() => {
      result.current.moderateAccount('mock-user-1', 'warnings', 'Cảnh báo tài khoản');
      result.current.moderateImage('mock-image-1', 'warnings', 'Cảnh báo ảnh');
    });
    expect(result.current.users[0].warningCount).toBe(2);
    expect(result.current.users[1].warningCount).toBe(0);
    expect(result.current.images[0].status).toBe('Available');
    expect(result.current.sessions[0].status).toBe('Active');
  });

  it('removes the selected image preview without deleting other images', () => {
    const { result } = renderHook(useAdminMock, { wrapper: AdminMockProvider });
    act(() => result.current.moderateImage('mock-image-1', 'delete', ''));
    expect(result.current.images[0]).toMatchObject({ status: 'Deleted', imageUrl: null });
    expect(result.current.images[1].status).toBe('Expired');
    expect(result.current.users[0].warningCount).toBe(0);
  });

  it('does not change records for unknown account or image identifiers', () => {
    const { result } = renderHook(useAdminMock, { wrapper: AdminMockProvider });
    const before = structuredClone({
      users: result.current.users,
      images: result.current.images,
      sessions: result.current.sessions,
    });
    act(() => {
      result.current.moderateAccount('missing', 'lock', 'Kiểm tra');
      result.current.moderateImage('missing', 'warnings', 'Kiểm tra');
      result.current.moderateImage('missing', 'delete', '');
    });
    expect(result.current).toMatchObject(before);
  });

  it('groups seven days using the Vietnam date across a UTC day boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T18:00:00Z'));
    const { result } = renderHook(useAdminMock, { wrapper: AdminMockProvider });
    expect(result.current.activity.days).toEqual([
      { date: '2026-10-10', userCount: 1, imageCount: 0, sessionCount: 0 },
      { date: '2026-10-11', userCount: 1, imageCount: 0, sessionCount: 0 },
      { date: '2026-10-12', userCount: 1, imageCount: 0, sessionCount: 0 },
      { date: '2026-10-13', userCount: 1, imageCount: 0, sessionCount: 0 },
      { date: '2026-10-14', userCount: 1, imageCount: 1, sessionCount: 1 },
      { date: '2026-10-15', userCount: 1, imageCount: 1, sessionCount: 1 },
      { date: '2026-10-16', userCount: 1, imageCount: 1, sessionCount: 1 },
    ]);
  });
});

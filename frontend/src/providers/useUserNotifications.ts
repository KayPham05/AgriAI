import { useCallback, useEffect, useState } from 'react';
import { catalogRequest, type CatalogPage } from '@/services/knowledgeApi';
import type { NotificationItem } from '@/types';

interface UserNotification {
  kind?: string;
  id: string;
  message: string;
  imageId: string | null;
  createdAt: string;
  readAt: string | null;
}

export function useUserNotifications(token: string | undefined, open: boolean) {
  const [result, setResult] = useState<{
    token: string;
    page: CatalogPage<UserNotification>;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: changing accounts resets private cached data and pagination.
  useEffect(() => {
    setResult(null);
    setPage(1);
    setError('');
    setLoading(false);
  }, [token]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision refreshes the server data after a mutation or retry.
  useEffect(() => {
    if (!token || !open) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    catalogRequest<CatalogPage<UserNotification>>(
      `/api/users/notifications?pageNumber=${page}&pageSize=10`,
      { token, signal: controller.signal },
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        if (page > Math.max(1, data.totalPages)) setPage(Math.max(1, data.totalPages));
        else setResult({ token, page: data });
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Không thể tải thông báo.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, open, page, revision]);

  async function updateAll(dismiss: boolean) {
    if (!token || busy) return;
    setBusy(true);
    setError('');
    try {
      await catalogRequest(`/api/users/notifications${dismiss ? '' : '/read'}`, {
        token,
        method: dismiss ? 'DELETE' : 'PUT',
      });
      refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không thể cập nhật thông báo.');
    } finally {
      setBusy(false);
    }
  }

  const data = result?.token === token ? result?.page : null;
  const notifications: NotificationItem[] = (data?.items ?? []).map((item) => ({
    id: item.id,
    title:
      item.kind === 'AccountRestored'
        ? 'Tài khoản đã được khôi phục'
        : item.imageId
          ? 'Cảnh báo về ảnh tải lên'
          : 'Cảnh báo từ quản trị viên',
    description: item.message,
    timestamp: new Date(item.createdAt).toLocaleString('vi-VN'),
    read: Boolean(item.readAt),
    type: item.kind === 'AccountRestored' ? 'success' : 'warning',
  }));
  return {
    notifications,
    loading,
    busy,
    error,
    refresh,
    markAllRead: () => updateAll(false),
    clearAll: () => updateAll(true),
    page,
    totalPages: data?.totalPages ?? 0,
    setPage,
  };
}

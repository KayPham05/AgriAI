import { useEffect, useMemo, useState } from 'react';
import type { NotificationItem } from '@/types';
import {
  getNotifications,
  updateNotifications,
  NotificationApiError,
} from '@/services/notificationsApi';

export function useAccountNotifications(
  token: string | undefined,
  open: boolean,
  onSessionExpired: () => void,
) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const request = useMemo(() => ({ token, open, revision }), [token, open, revision]);
  useEffect(() => {
    const token = request.token;
    if (!token) {
      setNotifications([]);
      setError('');
      return;
    }
    let controller: AbortController | undefined;
    async function refresh() {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      setLoading(true);
      try {
        const items = await getNotifications(token as string, signal);
        if (!signal.aborted) {
          setNotifications(items);
          setError('');
        }
      } catch (failure) {
        if (!signal.aborted) {
          if (failure instanceof NotificationApiError && failure.status === 401) onSessionExpired();
          else setError('Không thể tải thông báo. Vui lòng thử lại.');
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [request, onSessionExpired]);
  async function update(action: 'read' | 'dismiss') {
    if (!token || busy) return;
    setBusy(true);
    setError('');
    try {
      await updateNotifications(token, action);
      setRevision((value) => value + 1);
    } catch (failure) {
      if (failure instanceof NotificationApiError && failure.status === 401) onSessionExpired();
      else setError('Không thể cập nhật thông báo. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }
  return {
    notifications,
    error,
    busy,
    loading,
    markAllRead: () => void update('read'),
    clearAll: () => void update('dismiss'),
    retry: () => setRevision((value) => value + 1),
  };
}

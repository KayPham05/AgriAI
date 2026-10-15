import type { NotificationItem } from '@/types';

export class NotificationApiError extends Error {
  constructor(public readonly status: number) {
    super(
      status === 401
        ? 'Phiên đăng nhập đã bị thu hồi hoặc hết hạn.'
        : 'Không thể tải hoặc cập nhật thông báo. Vui lòng thử lại.',
    );
  }
}
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
async function request(
  token: string,
  path = '',
  method = 'GET',
  signal?: AbortSignal,
): Promise<Response> {
  const response = await fetch(`${baseUrl}/api/notifications${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new NotificationApiError(response.status);
  return response;
}
export async function getNotifications(
  token: string,
  signal: AbortSignal,
): Promise<NotificationItem[]> {
  const response = await request(token, '', 'GET', signal);
  const items: {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    readAt: string | null;
  }[] = await response.json();
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.message,
    timestamp: new Date(item.createdAt).toLocaleString('vi-VN'),
    read: item.readAt !== null,
    type: 'warning',
  }));
}
export async function updateNotifications(
  token: string,
  action: 'read' | 'dismiss',
): Promise<void> {
  await request(token, action === 'read' ? '/read-all' : '', action === 'read' ? 'POST' : 'DELETE');
}

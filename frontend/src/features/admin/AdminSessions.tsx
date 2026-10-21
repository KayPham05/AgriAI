import { useAdminMock } from './AdminMockProvider';
import type { AdminSession } from './adminTypes';
import { Badge } from '@/components/ui/badge';
import { AdminRecordList, formatAdminDate } from './AdminRecordList';

export function AdminSessions() {
  const { sessions } = useAdminMock();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <AdminRecordList<AdminSession>
        resource="sessions"
        items={sessions}
        title="Danh sách phiên đăng nhập"
        empty="Chưa có dữ liệu phiên đăng nhập"
      >
        {(session) => (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-semibold">{session.userName}</h2>
              <p className="mt-2 break-all text-sm text-muted-foreground">{session.userEmail}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Bắt đầu: {formatAdminDate(session.createdAt)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Hết hạn: {formatAdminDate(session.expiresAt)}
              </p>
              {session.endedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Kết thúc: {formatAdminDate(session.endedAt)}
                </p>
              )}
            </div>
            <Badge variant="outline">
              {session.status === 'Active'
                ? 'Còn hiệu lực'
                : session.status === 'Expired'
                  ? 'Hết hạn'
                  : 'Đã đăng xuất'}
            </Badge>
          </div>
        )}
      </AdminRecordList>
    </div>
  );
}

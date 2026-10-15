import type { AdminSession } from '@/services/adminApi';
import { Badge } from '@/components/ui/badge';
import { AdminRecordList, formatAdminDate } from './AdminRecordList';

export function AdminSessions({ token }: { token: string }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Chỉ ghi nhận phiên được cấp sau khi cập nhật backend. Còn hiệu lực không đồng nghĩa đang
        online.
      </p>
      <AdminRecordList<AdminSession>
        resource="sessions"
        token={token}
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

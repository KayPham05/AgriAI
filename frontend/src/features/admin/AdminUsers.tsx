import { useState } from 'react';
import { moderateAccount, type ManagedAdminUser } from '@/services/adminApi';
import { Button } from '@/components/ui/button';
import { AdminActionDialog } from './AdminActionDialog';
import { Badge } from '@/components/ui/badge';
import { AdminRecordList, formatAdminDate } from './AdminRecordList';

const ACTIONS = {
  lock: {
    title: 'Khóa tài khoản',
    confirm: 'Xác nhận khóa',
    description: 'Chặn đăng nhập và thu hồi mọi phiên hiện tại.',
    messageLabel: 'Lý do',
  },
  restore: {
    title: 'Khôi phục tài khoản',
    confirm: 'Xác nhận khôi phục',
    description: 'Cho phép đăng nhập trở lại. Các phiên cũ vẫn bị thu hồi.',
    messageLabel: undefined,
  },
  'logout-all': {
    title: 'Cưỡng chế đăng xuất',
    confirm: 'Xác nhận đăng xuất',
    description:
      'Thu hồi mọi phiên hiện tại. Người dùng có thể đăng nhập lại nếu tài khoản không bị khóa.',
    messageLabel: undefined,
  },
  warnings: {
    title: 'Gửi cảnh báo',
    confirm: 'Gửi cảnh báo',
    description: 'Gửi vào mục Thông báo trong ứng dụng của tài khoản này.',
    messageLabel: 'Nội dung cảnh báo',
  },
};
type Action = keyof typeof ACTIONS;

export function AdminUsers({ initialQuery = '', token }: { initialQuery?: string; token: string }) {
  const [revision, setRevision] = useState(0);
  const [action, setAction] = useState<{ user: ManagedAdminUser; kind: Action } | null>(null);
  const [notice, setNotice] = useState('');
  const copy = action ? ACTIONS[action.kind] : null;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
      <AdminRecordList<ManagedAdminUser>
        resource="users"
        token={token}
        revision={revision}
        title="Danh sách người dùng"
        empty="Chưa có dữ liệu người dùng"
        initialQuery={initialQuery}
      >
        {(user) => (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-semibold">{user.fullName}</h2>
                <p className="mt-2 break-all text-sm text-muted-foreground">{user.email}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tạo tài khoản: {formatAdminDate(user.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{user.role === 'Admin' ? 'Admin' : 'Người dùng'}</Badge>
                <Badge variant={!user.isActive ? 'destructive' : 'secondary'}>
                  {!user.isActive ? 'Đã khóa' : 'Hoạt động'}
                </Badge>
              </div>
            </div>
            {user.lockReason && (
              <p className="break-words text-sm text-muted-foreground">
                Lý do khóa: {user.lockReason}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {user.predictionCount} lần chẩn đoán đã lưu
            </p>
            {user.role !== 'Admin' && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAction({ user, kind: !user.isActive ? 'restore' : 'lock' })}
                >
                  {!user.isActive ? 'Khôi phục tài khoản' : 'Khóa tài khoản'}
                </Button>
                <Button variant="outline" onClick={() => setAction({ user, kind: 'warnings' })}>
                  Gửi cảnh báo
                </Button>
                <Button variant="outline" onClick={() => setAction({ user, kind: 'logout-all' })}>
                  Cưỡng chế đăng xuất
                </Button>
              </div>
            )}
          </div>
        )}
      </AdminRecordList>
      {action && copy && (
        <AdminActionDialog
          key={`${action.user.id}-${action.kind}`}
          title={copy.title}
          description={`${action.user.email}. ${copy.description}`}
          confirmText={copy.confirm}
          messageLabel={copy.messageLabel}
          maxLength={action.kind === 'lock' ? 500 : 1000}
          onClose={() => setAction(null)}
          onConfirm={async (message) => {
            await moderateAccount(token, action.user.id, action.kind, message);
            setRevision((value) => value + 1);
            setNotice('Đã cập nhật tài khoản trên hệ thống.');
          }}
        />
      )}
    </div>
  );
}

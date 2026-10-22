import { useAdminMock } from './AdminMockProvider';
import { useState } from 'react';
import type { AdminUser } from './adminTypes';
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

export function AdminUsers({ initialQuery = '' }: { initialQuery?: string }) {
  const { users, moderateAccount } = useAdminMock();
  const [action, setAction] = useState<{ user: AdminUser; kind: Action } | null>(null);
  const [notice, setNotice] = useState('');
  const copy = action ? ACTIONS[action.kind] : null;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
      <AdminRecordList<AdminUser>
        resource="users"
        items={users}
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
                <Badge variant={user.isLocked ? 'destructive' : 'secondary'}>
                  {user.isLocked ? 'Đã khóa' : 'Hoạt động'}
                </Badge>
              </div>
            </div>
            {user.lockReason && (
              <p className="break-words text-sm text-muted-foreground">
                Lý do khóa: {user.lockReason}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {user.warningCount ?? 0} cảnh báo đã gửi
            </p>
            {user.role !== 'Admin' && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAction({ user, kind: user.isLocked ? 'restore' : 'lock' })}
                >
                  {user.isLocked ? 'Khôi phục tài khoản' : 'Khóa tài khoản'}
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
          description={`${action.user.email}. Mô phỏng: ${copy.description} Không tác động tài khoản thật.`}
          confirmText={copy.confirm}
          messageLabel={copy.messageLabel}
          maxLength={action.kind === 'lock' ? 500 : 1000}
          onClose={() => setAction(null)}
          onConfirm={async (message) => {
            moderateAccount(action.user.id, action.kind, message);
            setNotice('Đã mô phỏng thao tác với tài khoản. Không thay đổi dữ liệu thật.');
          }}
        />
      )}
    </div>
  );
}

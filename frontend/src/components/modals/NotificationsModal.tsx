import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { NotificationItem } from '../../types';
interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
  error?: string;
  busy?: boolean;
  loading?: boolean;
  onRetry?: () => void;
}
export function NotificationsModal({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onClearAll,
  error,
  busy,
  loading,
  onRetry,
}: NotificationsModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thông báo</DialogTitle>
          <DialogDescription>
            {notifications.filter((item) => !item.read).length} thông báo chưa đọc
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button variant="outline" onClick={onRetry}>
              Thử lại
            </Button>
          </div>
        )}
        {loading && (
          <p role="status" className="text-sm text-muted-foreground">
            Đang tải thông báo...
          </p>
        )}
        {notifications.length === 0 && !loading && !error ? (
          <p className="py-10 text-center text-muted-foreground">Bạn chưa có thông báo nào.</p>
        ) : (
          <>
            <div className="max-h-96 divide-y divide-border overflow-y-auto">
              {notifications.map((item) => (
                <article key={item.id} className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{item.title}</h2>
                    {!item.read && (
                      <span className="text-xs font-medium text-primary">Chưa đọc</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.timestamp}</p>
                </article>
              ))}
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
              <Button variant="outline" disabled={busy || loading} onClick={onMarkAllRead}>
                Đánh dấu đã đọc
              </Button>
              <Button variant="ghost" disabled={busy || loading} onClick={onClearAll}>
                Xóa tất cả
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

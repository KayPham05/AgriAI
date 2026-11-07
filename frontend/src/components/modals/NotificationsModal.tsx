import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, ShieldCheck, TriangleAlert } from 'lucide-react';
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
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
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
  page = 1,
  totalPages = 1,
  onPageChange,
}: NotificationsModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85dvh] gap-5 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Bell className="size-5 text-primary" aria-hidden="true" />
            Thông báo
          </DialogTitle>
          <DialogDescription>
            {notifications.filter((item) => !item.read).length} thông báo chưa đọc trên trang này
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
          <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <CheckCheck className="size-8 text-primary" aria-hidden="true" />
            <p>Bạn chưa có thông báo nào.</p>
          </div>
        ) : (
          <>
            <div className="flex max-h-96 flex-col gap-3 overflow-y-auto" aria-busy={loading}>
              {notifications.map((item) => (
                <article
                  key={item.id}
                  className={`flex gap-3 rounded-card border p-4 ${item.read ? 'border-border bg-surface' : 'border-primary/25 bg-primary/5'}`}
                >
                  {item.type === 'success' ? (
                    <ShieldCheck
                      className="mt-0.5 size-5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                  ) : (
                    <TriangleAlert
                      className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{item.title}</h2>
                      {!item.read && (
                        <span className="text-xs font-medium text-primary">Chưa đọc</span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{item.timestamp}</p>
                  </div>
                </article>
              ))}
            </div>
            {totalPages > 1 && (
              <nav
                aria-label="Phân trang thông báo"
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <Button
                  variant="outline"
                  disabled={page <= 1 || busy || loading}
                  onClick={() => onPageChange?.(page - 1)}
                >
                  Trang trước
                </Button>
                <span>
                  Trang {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= totalPages || busy || loading}
                  onClick={() => onPageChange?.(page + 1)}
                >
                  Trang sau
                </Button>
              </nav>
            )}
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

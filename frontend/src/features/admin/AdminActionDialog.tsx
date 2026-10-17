import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export function AdminActionDialog({
  title,
  description,
  confirmText,
  messageLabel,
  maxLength = 1000,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmText: string;
  messageLabel?: string;
  maxLength?: number;
  onConfirm: (message: string) => Promise<void>;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (messageLabel && !message.trim()) {
      setError('Vui lòng nhập nội dung.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm(message.trim());
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Thao tác chưa hoàn tất.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        showCloseButton={!busy}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="break-words">{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-w-0 flex-col gap-4">
          {messageLabel && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="moderation-message">{messageLabel}</Label>
              <Textarea
                id="moderation-message"
                value={message}
                maxLength={maxLength}
                disabled={busy}
                onChange={(event) => setMessage(event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Tối đa {maxLength} ký tự.</p>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Đang xử lý...' : confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

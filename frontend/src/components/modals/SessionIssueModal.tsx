import { ShieldAlert } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import type { SessionIssue } from '@/services/sessionFetch';

export function SessionIssueModal({
  issue,
  onConfirm,
}: {
  issue: SessionIssue;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open>
      <AlertDialogContent
        onEscapeKeyDown={(event) => event.preventDefault()}
        className="sm:max-w-md"
      >
        <ShieldAlert className="size-8 text-destructive" aria-hidden="true" />
        <AlertDialogHeader>
          <AlertDialogTitle>
            {issue.code === 'account_locked'
              ? 'Tài khoản đã bị khóa'
              : 'Bạn bị cưỡng chế đăng xuất từ admin'}
          </AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap break-words">
            {issue.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-sm text-muted-foreground">
          Nhấn “Đã hiểu” để quay về màn hình đăng nhập.
        </p>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onConfirm}>Đã hiểu</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

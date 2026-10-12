import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Toast } from '../../types';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const shownIds = useRef(new Set<string>());

  useEffect(() => {
    const currentIds = new Set(toasts.map(item => item.id));
    for (const id of shownIds.current) {
      if (!currentIds.has(id)) {
        toast.dismiss(id);
        shownIds.current.delete(id);
      }
    }
    for (const item of toasts) {
      if (shownIds.current.has(item.id)) continue;
      shownIds.current.add(item.id);
      toast[item.type](item.title || item.message, {
        id: item.id,
        description: item.title ? item.message : undefined,
        onDismiss: () => onDismiss(item.id),
        onAutoClose: () => onDismiss(item.id),
        action: { label: 'Đóng', onClick: () => onDismiss(item.id) },
      });
    }
  }, [toasts, onDismiss]);

  useEffect(() => {
    const ids = shownIds.current;
    return () => {
      for (const id of ids) toast.dismiss(id);
      ids.clear();
    };
  }, []);

  return <Toaster theme="light" position="bottom-right" offset={24} mobileOffset={{ bottom: 96, left: 20, right: 20 }} toastOptions={{ classNames: { actionButton: 'min-h-11 min-w-11' } }} />;
}

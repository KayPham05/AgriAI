'use client';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export function CatalogSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value || 'all'}
        onValueChange={(next) => onChange(next === 'all' ? '' : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">Tất cả</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
export function CatalogPager({
  page,
  totalPages,
  totalCount,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Phân trang danh mục"
      className="flex flex-wrap items-center justify-between gap-3 py-4"
    >
      <p className="text-sm text-muted-foreground">
        {totalCount} kết quả · Trang {page}/{Math.max(1, totalPages)}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Trang trước
        </Button>
        <Button variant="outline" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Trang sau
        </Button>
      </div>
    </nav>
  );
}
export function ConfirmAction({
  text,
  onConfirm,
  onClose,
}: {
  text: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận thay đổi</AlertDialogTitle>
          <AlertDialogDescription>{text}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Xác nhận</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

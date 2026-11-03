'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type {
  AgriculturalProfile,
  AgriculturalProfileInput,
} from '@/services/agriculturalProfileApi';

interface AgriculturalProfileFormProps {
  profile?: AgriculturalProfile;
  ownerName: string;
  isSubmitting: boolean;
  onSubmit: (input: AgriculturalProfileInput) => Promise<void>;
  onCancel: () => void;
}

export function AgriculturalProfileForm({
  profile,
  ownerName,
  isSubmitting,
  onSubmit,
  onCancel,
}: AgriculturalProfileFormProps) {
  const [name, setName] = useState(profile?.name ?? '');
  const [description, setDescription] = useState(profile?.description ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);
  const isDirty = name !== (profile?.name ?? '') || description !== (profile?.description ?? '');

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [isDirty]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError('Vui lòng nhập tên hồ sơ.');
      return;
    }
    if (trimmedName.length > 150) {
      setValidationError('Tên hồ sơ không được vượt quá 150 ký tự.');
      return;
    }
    setValidationError(null);
    await onSubmit({ name: trimmedName, description: description.trim() || null });
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
      aria-label="Biểu mẫu hồ sơ nông nghiệp"
    >
      <div className="grid gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="agricultural-profile-name">Tên hồ sơ *</Label>
          <Input
            id="agricultural-profile-name"
            value={name}
            maxLength={150}
            placeholder="Ví dụ: Vườn nhà"
            required
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? 'profile-name-error' : 'profile-name-hint'}
            className="h-13 rounded-xl border-border px-3.5"
            onChange={(event) => setName(event.target.value)}
          />
          <p id="profile-name-hint" className="text-xs text-muted-foreground">
            Bắt buộc · Tối đa 150 ký tự
          </p>
          {validationError && (
            <p id="profile-name-error" role="alert" className="text-sm text-destructive">
              {validationError}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="agricultural-profile-description">Mô tả và thông tin canh tác</Label>
          <Textarea
            id="agricultural-profile-description"
            value={description}
            placeholder="Cây trồng, loại đất, diện tích, ngày trồng, phương pháp tưới..."
            rows={1}
            className="min-h-13 rounded-xl border-border px-3.5 py-3.5"
            onChange={(event) => setDescription(event.target.value)}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Có thể ghi nhiều loại cây trong cùng một hồ sơ.
          </p>
        </div>
        <Separator />
        <div className="flex flex-col gap-5">
          <p className="font-semibold text-primary">Chủ sở hữu: {ownerName}</p>
          <p className="text-sm leading-6 text-muted-foreground">
            {profile
              ? 'Không hỗ trợ chuyển quyền sở hữu.'
              : 'Hồ sơ tự động gắn với tài khoản đang đăng nhập.'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <Button
          type="button"
          variant="outline"
          className="border-border px-6"
          onClick={() => (isDirty ? setShowDiscard(true) : onCancel())}
          disabled={isSubmitting}
        >
          Hủy
        </Button>
        <Button type="submit" className="px-6" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : profile ? 'Lưu thay đổi' : 'Tạo hồ sơ'}
        </Button>
      </div>
      <AlertDialog open={showDiscard} onOpenChange={setShowDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ thay đổi?</AlertDialogTitle>
            <AlertDialogDescription>
              Nội dung chưa lưu sẽ bị mất nếu bạn rời biểu mẫu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ở lại</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel}>Bỏ thay đổi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

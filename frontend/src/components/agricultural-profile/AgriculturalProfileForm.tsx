'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" aria-label="Biểu mẫu hồ sơ nông nghiệp">
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
            onChange={(event) => setName(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">Đặt tên dễ nhận biết cho khu vực canh tác.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="agricultural-profile-description">Mô tả và thông tin canh tác</Label>
          <Textarea
            id="agricultural-profile-description"
            value={description}
            placeholder="Cây trồng, loại đất, diện tích, ngày trồng, phương pháp tưới..."
            rows={5}
            onChange={(event) => setDescription(event.target.value)}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Có thể ghi nhiều thông tin để tiện theo dõi từng khu vực.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chủ sở hữu</p>
          <p className="mt-1 font-medium text-foreground">{ownerName}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Hồ sơ này chỉ hiển thị với tài khoản của bạn.
          </p>
        </div>
      </div>
      {validationError && (
        <p role="alert" className="text-sm text-destructive">
          {validationError}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X data-icon="inline-start" />
          Hủy
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Check data-icon="inline-start" />
          {isSubmitting ? 'Đang lưu...' : profile ? 'Lưu thay đổi' : 'Tạo hồ sơ'}
        </Button>
      </div>
    </form>
  );
}

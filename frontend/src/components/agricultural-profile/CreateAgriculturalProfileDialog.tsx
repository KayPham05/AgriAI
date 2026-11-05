'use client';

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AgriculturalProfileForm,
  type AgriculturalProfileFormHandle,
} from '@/components/agricultural-profile/AgriculturalProfileForm';
import type {
  AgriculturalProfile,
  AgriculturalProfileInput,
} from '@/services/agriculturalProfileApi';

interface CreateAgriculturalProfileDialogProps {
  ownerName: string;
  onCreate: (input: AgriculturalProfileInput) => Promise<AgriculturalProfile>;
  onCreated: (profile: AgriculturalProfile) => void;
  onClose: () => void;
}

export function CreateAgriculturalProfileDialog({
  ownerName,
  onCreate,
  onCreated,
  onClose,
}: CreateAgriculturalProfileDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const formRef = useRef<AgriculturalProfileFormHandle>(null);

  const submit = async (input: AgriculturalProfileInput) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setError(null);
    try {
      const created = await onCreate(input);
      onCreated(created);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tạo hồ sơ. Vui lòng thử lại.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !savingRef.current) formRef.current?.requestCancel();
      }}
    >
      <DialogContent
        className="sm:max-w-2xl"
        showCloseButton={!isSaving}
        onEscapeKeyDown={(event) => {
          if (savingRef.current) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (savingRef.current) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Thêm hồ sơ mới</DialogTitle>
          <DialogDescription>
            Tạo hồ sơ ngay tại đây. Ảnh bạn đang chọn được giữ nguyên.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AgriculturalProfileForm
          ref={formRef}
          ownerName={ownerName}
          isSubmitting={isSaving}
          onSubmit={submit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

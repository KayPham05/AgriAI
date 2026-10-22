'use client';

import { useEffect, useRef, useState } from 'react';
import NextImage from 'next/image';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getImageFileError } from '@/utils/imageFileValidation';

interface ProfileAvatarEditorProps {
  name: string;
  avatarUrl: string;
  onChange: (avatarUrl: string) => void;
}

export function ProfileAvatarEditor({ name, avatarUrl, onChange }: ProfileAvatarEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLButtonElement>(null);
  const cancelReadRef = useRef<(() => void) | null>(null);
  const onChangeRef = useRef(onChange);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState('');
  const [hasChanged, setHasChanged] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState('');
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase() || 'L';

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => () => cancelReadRef.current?.(), []);

  const selectAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    cancelReadRef.current?.();
    setHasChanged(false);
    const validationError = getImageFileError(file);
    setError(validationError || '');
    if (validationError) return;
    setIsReading(true);
    const reader = new FileReader();
    const image = new window.Image();
    const cleanup = () => {
      reader.onload = null;
      reader.onerror = null;
      image.onload = null;
      image.onerror = null;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
    cancelReadRef.current = cleanup;
    const fail = () => {
      cleanup();
      setIsReading(false);
      setError('Không đọc được ảnh. Vui lòng chọn ảnh JPG hoặc PNG khác.');
    };
    reader.onerror = fail;
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        fail();
        return;
      }
      image.onerror = fail;
      image.onload = () => {
        if (!image.naturalWidth) {
          fail();
          return;
        }
        cleanup();
        setIsReading(false);
        setPendingAvatar(result);
      };
      image.src = result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex w-24 shrink-0 flex-col items-center gap-3 lg:w-full">
      <div className="relative size-16 lg:size-24">
        {avatarUrl ? (
          <NextImage
            unoptimized
            src={avatarUrl}
            alt={`Ảnh đại diện của ${name}`}
            width={96}
            height={96}
            className="size-16 rounded-full object-cover ring-4 ring-surface lg:size-24"
          />
        ) : (
          <div
            className="grid size-16 place-items-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground ring-4 ring-surface lg:size-24 lg:text-3xl"
            aria-hidden="true"
          >
            {initials}
          </div>
        )}
        <Button
          ref={cameraRef}
          type="button"
          variant="ghost"
          size="icon"
          className="absolute -right-2 -bottom-2 rounded-full"
          disabled={isReading}
          aria-label={isReading ? 'Đang đọc ảnh' : 'Đổi ảnh đại diện'}
          title={isReading ? 'Đang đọc ảnh' : 'Đổi ảnh đại diện'}
          onClick={() => inputRef.current?.click()}
        >
          <span className="grid size-8 place-items-center rounded-full border border-border bg-surface text-primary">
            <Camera aria-hidden="true" />
          </span>
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        aria-label="Chọn ảnh đại diện"
        aria-describedby="profile-avatar-help"
        className="sr-only"
        tabIndex={-1}
        disabled={isReading}
        onChange={selectAvatar}
      />
      {error && !pendingAvatar && (
        <p role="alert" className="text-sm leading-6 text-destructive">
          {error}
        </p>
      )}
      {hasChanged && (
        <p role="status" className="sr-only">
          Đã đổi ảnh đại diện trong phiên này.
        </p>
      )}
      <Dialog
        open={Boolean(pendingAvatar)}
        onOpenChange={(open) => {
          if (!open) {
            cancelReadRef.current?.();
            setPendingAvatar('');
            setIsReading(false);
            setError('');
          }
        }}
      >
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            cameraRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Lưu ảnh đại diện mới?</DialogTitle>
            <DialogDescription>
              Xem trước ảnh và xác nhận trước khi thay đổi. Ảnh chỉ được giữ trong phiên hiện tại.
            </DialogDescription>
          </DialogHeader>
          {pendingAvatar && (
            <NextImage
              unoptimized
              src={pendingAvatar}
              alt="Xem trước ảnh đại diện mới"
              width={160}
              height={160}
              className="mx-auto my-4 size-40 rounded-full bg-surface-muted object-cover"
            />
          )}
          <Button variant="outline" disabled={isReading} onClick={() => inputRef.current?.click()}>
            <Camera data-icon="inline-start" />
            {isReading ? 'Đang đọc ảnh' : 'Chọn ảnh khác'}
          </Button>
          {error && (
            <p role="alert" className="text-sm leading-6 text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                cancelReadRef.current?.();
                setPendingAvatar('');
                setIsReading(false);
                setError('');
              }}
            >
              Không lưu
            </Button>
            <Button
              disabled={isReading || Boolean(error)}
              onClick={() => {
                onChangeRef.current(pendingAvatar);
                setPendingAvatar('');
                setHasChanged(true);
              }}
            >
              Lưu ảnh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

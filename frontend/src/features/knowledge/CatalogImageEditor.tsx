'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Upload, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReferenceImage } from '@/components/common/ReferenceImage';
import { catalogRequest, type CatalogRecord } from '@/services/knowledgeApi';
import { sessionFetch } from '@/services/sessionFetch';
import { catalogImageSource } from '@/lib/catalogImages';
import { ConfirmAction } from './CatalogControls';
import { catalogError } from './catalogUi';

export function CatalogImageEditor({
  kind,
  record,
  token,
  disabled,
  onChange,
  onBusyChange,
  onDirtyChange,
}: {
  kind: 'plants' | 'diseases';
  record: CatalogRecord;
  token: string;
  disabled: boolean;
  onChange: (imageUrl: string | null) => void;
  onBusyChange: (busy: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [saved, setSaved] = useState<{ source: string; url: string } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const source = catalogImageSource(record.imageUrl);
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    let url: string | undefined;
    void sessionFetch(source, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Không tải được ảnh đã lưu.');
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setSaved({ source, url });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSaved({ source, url: '' });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [source, token]);
  useEffect(() => () => request.current?.abort(), []);

  function clearFile() {
    setFile(null);
    if (input.current) input.current.value = '';
    onDirtyChange(false);
  }
  function selectFile(candidate?: File) {
    setError('');
    setNotice('');
    if (!candidate) return;
    if (
      !['image/jpeg', 'image/png'].includes(candidate.type) ||
      candidate.size < 1 ||
      candidate.size > 5 * 1024 * 1024
    ) {
      setError('Chọn ảnh JPG hoặc PNG không quá 5 MB.');
      clearFile();
      return;
    }
    setFile(candidate);
    onDirtyChange(true);
  }
  async function mutate(remove: boolean) {
    if (request.current || disabled || !record.id || (!remove && !file)) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    onBusyChange(true);
    setError('');
    setNotice('');
    try {
      const body = new FormData();
      if (file) body.append('file', file);
      const result = await catalogRequest<{ imageUrl: string }>(
        `/api/catalog/${kind}/${record.id}/image`,
        {
          token,
          method: remove ? 'DELETE' : 'PUT',
          body: remove ? undefined : body,
          signal: controller.signal,
        },
      );
      if (controller.signal.aborted) return;
      onChange(remove ? null : result.imageUrl);
      clearFile();
      setNotice(
        remove ? 'Đã gỡ ảnh tải lên.' : 'Đã lưu ảnh. Ảnh sẽ hiển thị tại danh mục phía người dùng.',
      );
    } catch (failure) {
      if (!controller.signal.aborted) setError(catalogError(failure));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) {
        setPending(false);
        onBusyChange(false);
      }
    }
  }
  const previewSource = file ? preview : saved?.source === source ? saved?.url : undefined;
  return (
    <section
      aria-label="Ảnh minh họa danh mục"
      className="flex flex-col gap-4 border-t border-border pt-5"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">Ảnh minh họa</h3>
        <p id={`${id}-help`} className="text-sm text-muted-foreground">
          JPG hoặc PNG, tối đa 5 MB. Nên chọn ảnh ngang, rõ nét. Ảnh được lưu riêng với nội dung.
        </p>
      </div>
      {!record.id ? (
        <p className="text-sm text-muted-foreground">
          Lưu nội dung để tạo mục mới, sau đó tải ảnh lên tại đây.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-border">
            {previewSource ? (
              <ReferenceImage
                src={previewSource}
                alt={file ? 'Xem trước ảnh đã chọn' : 'Ảnh minh họa đã lưu'}
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center gap-2 bg-surface-muted p-4 text-sm text-muted-foreground">
                <ImageOff className="size-5" aria-hidden="true" />
                {source
                  ? saved?.source === source
                    ? 'Không tải được ảnh đã lưu'
                    : 'Đang tải ảnh...'
                  : 'Chưa tải ảnh minh họa'}
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <Label htmlFor={id}>Chọn ảnh {kind === 'plants' ? 'cây trồng' : 'bệnh cây'}</Label>
            <Input
              ref={input}
              id={id}
              type="file"
              accept="image/jpeg,image/png"
              disabled={disabled || pending}
              aria-describedby={`${id}-help`}
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
            {file && (
              <p className="break-words text-sm">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={disabled || pending || !file}
                onClick={() => void mutate(false)}
              >
                <Upload className="size-4" aria-hidden="true" />
                {pending ? 'Đang lưu...' : 'Lưu ảnh'}
              </Button>
              {file && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled || pending}
                  onClick={clearFile}
                >
                  Bỏ chọn
                </Button>
              )}
              {record.imageUrl && !file && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled || pending}
                  onClick={() => setConfirmRemove(true)}
                >
                  Gỡ ảnh đã tải
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Nếu chưa có ảnh tải lên, trang người dùng giữ ảnh mặc định nếu có.
            </p>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
      {confirmRemove && (
        <ConfirmAction
          text="Gỡ ảnh minh họa đã tải lên? Nội dung danh mục được giữ nguyên."
          onClose={() => setConfirmRemove(false)}
          onConfirm={() => void mutate(true)}
        />
      )}
    </section>
  );
}

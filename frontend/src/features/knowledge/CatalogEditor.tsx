'use client';
import { useId, useRef, useState } from 'react';
import type { CatalogKind, CatalogRecord, PlantDiseasePair } from '@/services/knowledgeApi';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { catalogError, contentFields, safeSource } from './catalogUi';

export function CatalogEditor({
  kind,
  record,
  pairs,
  onSave,
  onDirtyChange,
  disabled = false,
}: {
  kind: CatalogKind;
  record: CatalogRecord;
  pairs: PlantDiseasePair[];
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(contentFields[kind].map(({ key }) => [key, String(record[key] ?? '')])),
  );
  const [selected, setSelected] = useState(record.plantDiseaseIds ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState('');
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [preview, setPreview] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || disabled) return;
    const problems: Record<string, string> = {};
    for (const field of contentFields[kind]) {
      const value = draft[field.key]?.trim() ?? '';
      if (field.required && !value) problems[field.key] = 'Vui lòng nhập trường này.';
      else if (field.maxLength && value.length > field.maxLength)
        problems[field.key] = `Tối đa ${field.maxLength} ký tự.`;
      else if (field.key === 'sourceUrl' && !safeSource(value))
        problems[field.key] = 'Nhập link HTTP(S) đầy đủ, không chứa thông tin đăng nhập.';
    }
    setErrors(problems);
    setFailure('');
    if (Object.keys(problems).length) return;
    const body: Record<string, unknown> = Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [key, value.trim()]),
    );
    if (kind === 'knowledge-documents') body.plantDiseaseIds = selected;
    if (record.id && (kind === 'plants' || kind === 'diseases')) body.isActive = record.isActive;
    inFlight.current = true;
    setPending(true);
    try {
      await onSave(body);
      onDirtyChange?.(false);
    } catch (error) {
      setFailure(catalogError(error));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-5">
      <fieldset disabled={pending || disabled} className="flex min-w-0 flex-col gap-4">
        <legend className="sr-only">Nội dung danh mục</legend>
        {contentFields[kind].map((field) => {
          const control = {
            id: `${id}-${field.key}`,
            value: draft[field.key],
            required: field.required,
            maxLength: field.maxLength,
            'aria-invalid': Boolean(errors[field.key]),
            'aria-describedby': errors[field.key] ? `${id}-${field.key}-error` : undefined,
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              setDraft((current) => ({ ...current, [field.key]: event.target.value }));
              onDirtyChange?.(true);
            },
          };
          return (
            <div key={field.key} className="flex min-w-0 flex-col gap-2">
              <Label htmlFor={control.id}>{field.label}</Label>
              {field.multiline ? (
                <Textarea {...control} rows={field.key === 'content' ? 10 : 4} />
              ) : (
                <Input {...control} />
              )}
              {errors[field.key] && (
                <p id={`${control.id}-error`} role="alert" className="text-sm text-destructive">
                  {errors[field.key]}
                </p>
              )}
            </div>
          );
        })}
        {kind === 'knowledge-documents' && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-semibold">Liên kết cây và bệnh (không bắt buộc)</legend>
            <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
              {pairs.map((pair) => (
                <Label key={pair.id} className="flex min-h-11 items-center gap-3">
                  <Checkbox
                    checked={selected.includes(pair.id)}
                    disabled={!pair.isActive && !selected.includes(pair.id)}
                    onCheckedChange={(checked) => {
                      setSelected((current) =>
                        checked
                          ? [...current, pair.id]
                          : current.filter((value) => value !== pair.id),
                      );
                      onDirtyChange?.(true);
                    }}
                  />
                  {pair.plantName} / {pair.diseaseName}
                  {!pair.isActive && ' (ngừng hoạt động)'}
                </Label>
              ))}
            </div>
            {selected
              .filter((value) => !pairs.some((pair) => pair.id === value))
              .map((value) => (
                <p key={value} className="text-sm">
                  Liên kết không khả dụng: {value}. Đang giữ nguyên.
                </p>
              ))}
            <p className="text-sm text-muted-foreground">
              Không chọn cặp nào để tạo bài viết chung.
            </p>
          </fieldset>
        )}
      </fieldset>
      {failure && (
        <p role="alert" className="text-destructive">
          {failure}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending || disabled}>
          {pending ? 'Đang lưu...' : 'Lưu nội dung'}
        </Button>
        {kind === 'knowledge-documents' && (
          <Button type="button" variant="outline" onClick={() => setPreview((value) => !value)}>
            Xem trước bài viết
          </Button>
        )}
      </div>
      {preview && (
        <section
          aria-label="Xem trước bài viết"
          className="flex flex-col gap-3 border-t border-border pt-4"
        >
          <h3 className="break-words text-xl font-bold">{draft.title}</h3>
          <p className="whitespace-pre-wrap break-words">{draft.content}</p>
        </section>
      )}
      {record.id && kind !== 'plants' && (
        <p className="text-sm text-muted-foreground">
          Thay đổi nội dung cần được duyệt lại trước khi công khai.
        </p>
      )}
    </form>
  );
}

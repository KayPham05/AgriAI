'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AgriculturalProfileForm } from './AgriculturalProfileForm';
import { assignPredictionProfile } from '@/services/predictionApi';
import type {
  AgriculturalProfile,
  AgriculturalProfileInput,
} from '@/services/agriculturalProfileApi';

interface SavePredictionProfileDialogProps {
  predictionId: string;
  token: string;
  profiles: AgriculturalProfile[];
  initialProfileId?: string;
  ownerName: string;
  onCreate?: (input: AgriculturalProfileInput) => Promise<AgriculturalProfile>;
  onSaved: (profile: AgriculturalProfile) => void;
  onClose: () => void;
}

export function SavePredictionProfileDialog({
  predictionId,
  token,
  profiles,
  initialProfileId,
  ownerName,
  onCreate,
  onSaved,
  onClose,
}: SavePredictionProfileDialogProps) {
  const [selectedId, setSelectedId] = useState(initialProfileId);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const selected = profiles.find((profile) => profile.id === selectedId);

  const create = async (input: AgriculturalProfileInput) => {
    if (!onCreate || pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      const profile = await onCreate(input);
      setSelectedId(profile.id);
      setCreating(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tạo hồ sơ. Vui lòng thử lại.');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  const save = async () => {
    if (!selected || pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      await assignPredictionProfile(predictionId, selected.id, token);
      onSaved(selected);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu kết quả. Vui lòng thử lại.');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending.current) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90svh] overflow-y-auto sm:max-w-2xl"
        showCloseButton={!saving && !creating}
        onEscapeKeyDown={(event) => {
          if (pending.current || creating) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (pending.current || creating) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {creating ? 'Thêm hồ sơ mới' : 'Bạn có muốn lưu kết quả vào hồ sơ nông nghiệp không?'}
          </DialogTitle>
          <DialogDescription>
            {creating
              ? 'Tạo hồ sơ rồi chọn lưu kết quả vừa phân tích vào hồ sơ đó.'
              : 'Chọn khu vực canh tác để theo dõi kết quả này. Bỏ qua vẫn giữ kết quả trong Mẫu đã lưu.'}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {creating ? (
          <AgriculturalProfileForm
            ownerName={ownerName}
            isSubmitting={saving}
            onSubmit={create}
            onCancel={() => {
              setCreating(false);
              setError(null);
            }}
          />
        ) : (
          <>
            {profiles.length > 0 ? (
              <div className="grid gap-2">
                <Label htmlFor="save-prediction-profile">Hồ sơ nông nghiệp</Label>
                <Select value={selected?.id ?? ''} onValueChange={setSelectedId} disabled={saving}>
                  <SelectTrigger id="save-prediction-profile" className="w-full">
                    <SelectValue placeholder="Chọn hồ sơ để lưu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Bạn chưa có hồ sơ nông nghiệp. Tạo hồ sơ mới để lưu kết quả này.
              </p>
            )}
            {onCreate && (
              <Button
                variant="outline"
                className="w-fit"
                disabled={saving}
                onClick={() => {
                  setError(null);
                  setCreating(true);
                }}
              >
                Thêm hồ sơ mới
              </Button>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" disabled={saving} onClick={onClose}>
                Bỏ qua
              </Button>
              <Button disabled={!selected || saving} onClick={() => void save()}>
                {saving ? 'Đang lưu...' : 'Lưu vào hồ sơ'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

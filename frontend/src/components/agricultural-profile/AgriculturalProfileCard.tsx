'use client';

import { Button } from '@/components/ui/button';
import type { AgriculturalProfile } from '@/services/agriculturalProfileApi';

export function AgriculturalProfileCard({
  profile,
  onView,
}: {
  profile: AgriculturalProfile;
  onView: () => void;
}) {
  return (
    <article className="grid gap-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="break-words text-xl font-bold leading-8">{profile.name}</h3>
        <p className="whitespace-pre-line break-words text-sm leading-6 text-muted-foreground">
          {profile.description || 'Chưa có ghi chú canh tác'}
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          {profile.predictionCount > 0
            ? `${profile.predictionCount} lượt chẩn đoán`
            : 'Chưa có chẩn đoán'}
          {' · '}Cập nhật{' '}
          {new Date(profile.updatedAt ?? profile.createdAt).toLocaleDateString('vi-VN')}
        </p>
      </div>
      <Button variant="outline" className="w-fit self-start border-border px-6" onClick={onView}>
        Xem chi tiết
      </Button>
    </article>
  );
}

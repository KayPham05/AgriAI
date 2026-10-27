'use client';

import { CalendarDays, ChevronRight, History, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AgriculturalProfile } from '@/services/agriculturalProfileApi';

interface AgriculturalProfileCardProps {
  profile: AgriculturalProfile;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function AgriculturalProfileCard({
  profile,
  onView,
  onEdit,
  onDelete,
}: AgriculturalProfileCardProps) {
  return (
    <Card className="bg-surface ring-border/80">
      <CardHeader className="gap-3 border-b border-border pb-4">
        <div className="min-w-0 pr-20">
          <CardTitle className="break-words text-lg font-bold">{profile.name}</CardTitle>
          <CardDescription className="mt-1 flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            Tạo ngày {new Date(profile.createdAt).toLocaleDateString('vi-VN')}
          </CardDescription>
        </div>
        <CardAction className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Sửa ${profile.name}`}>
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label={`Xóa ${profile.name}`}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5 pt-4">
        <p className="min-h-12 whitespace-pre-line text-sm leading-6 text-muted-foreground">
          {profile.description || 'Chưa có mô tả hoặc ghi chú canh tác.'}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <History className="size-4 text-primary" aria-hidden="true" />
            {profile.predictionCount} lần chẩn đoán
          </span>
          <Button variant="outline" size="sm" onClick={onView}>
            Chi tiết
            <ChevronRight data-icon="inline-end" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import type { AgriculturalProfile } from '@/services/agriculturalProfileApi';

export function AgriculturalProfileCard({
  profile,
  onView,
}: {
  profile: AgriculturalProfile;
  onView: () => void;
}) {
  return (
    <article className="h-full min-w-0">
      <Card className="h-full gap-5 rounded-card border border-border bg-surface pt-6 ring-0">
        <CardHeader className="gap-3 px-6">
          <CardTitle>
            <h3 className="break-words text-xl font-bold leading-8">{profile.name}</h3>
          </CardTitle>
          <CardDescription className="line-clamp-3 whitespace-pre-line break-words leading-6">
            {profile.description || 'Chưa có ghi chú canh tác'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 px-6">
          <p className="font-semibold text-primary">
            {profile.predictionCount > 0
              ? `${profile.predictionCount} lượt chẩn đoán`
              : 'Chưa có chẩn đoán'}
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            Cập nhật {new Date(profile.updatedAt ?? profile.createdAt).toLocaleDateString('vi-VN')}
          </p>
        </CardContent>
        <CardFooter className="mt-auto justify-end border-border px-6 py-4">
          <Button variant="outline" className="px-6" onClick={onView}>
            Xem chi tiết
          </Button>
        </CardFooter>
      </Card>
    </article>
  );
}

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { findPlantTemplate } from '@/services/catalogApi';
import {
  recordName,
  type CatalogKind,
  type CatalogRecord,
  type PlantDiseasePair,
} from '@/services/knowledgeApi';
import { LEAF_PHOTOS, LEAF_PHOTO_NOTE } from '@/data/leafPhotos';
import { publicPath } from './catalogUi';

function conditionKey(value: string): string {
  return value
    .split('(')[0]
    .trim()
    .toLocaleLowerCase('vi')
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function diseaseIllustration(record: CatalogRecord, pairs: PlantDiseasePair[]) {
  // Match both identities from the backend class, never a shared disease name alone.
  for (const pair of pairs) {
    if (!pair.isActive || pair.diseaseId !== record.id) continue;
    const [crop, condition] = pair.className.split('___');
    if (!crop || !condition) continue;
    const plant = findPlantTemplate({ name: crop, vietnameseName: null });
    const photo = LEAF_PHOTOS.find(
      (item) => item.plantId === plant?.id && conditionKey(item.name) === conditionKey(condition),
    );
    if (photo)
      return {
        src: photo.imageUrl,
        alt: `${recordName(record)} trên lá ${pair.plantName}`,
        plant: pair.plantName,
      };
  }
  return undefined;
}

export function PublicCatalogCard({
  kind,
  record,
  pairs,
}: {
  kind: Exclude<CatalogKind, 'knowledge-documents'>;
  record: CatalogRecord;
  pairs: PlantDiseasePair[];
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const plant =
    kind === 'plants'
      ? findPlantTemplate({
          name: record.name ?? '',
          vietnameseName: record.vietnameseName ?? null,
        })
      : undefined;
  const illustration = kind === 'diseases' ? diseaseIllustration(record, pairs) : undefined;
  const image = plant ? { src: plant.imageUrl, alt: plant.name } : illustration;
  const showImage = image && failedImage !== image.src;
  const missingImage =
    kind === 'plants'
      ? 'Chưa có ảnh cây trồng'
      : kind === 'diseases'
        ? 'Chưa có ảnh đối chiếu'
        : 'Chưa có ảnh sản phẩm';
  const subtitle =
    kind === 'plants'
      ? record.scientificName || plant?.scientificName
      : kind === 'medicines'
        ? record.activeIngredient
        : illustration?.plant;
  const description =
    record.targetUse ||
    record.description ||
    (kind === 'medicines'
      ? 'Xem đối tượng sử dụng và hướng dẫn đã được công khai.'
      : 'Thông tin đang được cập nhật.');
  const href = `${publicPath(kind)}/${record.id}`;

  return (
    <Card className="h-full min-w-0 gap-5 rounded-card border border-border bg-surface pt-0 ring-0">
      {showImage ? (
        <Image
          src={image.src}
          alt={image.alt}
          width={640}
          height={360}
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="aspect-video w-full object-cover"
          onError={() => setFailedImage(image.src)}
        />
      ) : (
        <div className="flex aspect-video items-center justify-center border-b border-border bg-surface-muted px-5 text-center text-sm text-muted-foreground">
          {missingImage}
        </div>
      )}
      <CardHeader className="gap-2 px-5">
        <CardTitle>
          <h2 className="break-words text-xl font-semibold leading-7">
            <Link
              href={href}
              className="rounded-sm hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
            >
              {recordName(record)}
            </Link>
          </h2>
        </CardTitle>
        {subtitle && (
          <CardDescription className="break-words text-sm leading-6">{subtitle}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-3 px-5">
        {plant && <p className="text-sm font-medium text-primary">{plant.category}</p>}
        <p className="line-clamp-3 break-words leading-6 text-muted-foreground">{description}</p>
        {illustration && showImage && (
          <p className="text-xs leading-5 text-muted-foreground">{LEAF_PHOTO_NOTE}</p>
        )}
      </CardContent>
      <CardFooter className="px-5 py-4">
        <Button asChild variant="link" className="min-h-11 px-0">
          <Link href={href}>Xem chi tiết</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

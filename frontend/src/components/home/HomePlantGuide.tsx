'use client';

import type { NavigationTab, Plant } from '@/types';
import Image from 'next/image';
import { ArrowRight, Camera, ScanLine, ShieldCheck, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CORE_PLANT_IDS, SUPPORTED_PLANTS } from '@/data/plantData';

const plants = [...SUPPORTED_PLANTS].sort(
  (left, right) =>
    Number(CORE_PLANT_IDS.includes(right.id)) - Number(CORE_PLANT_IDS.includes(left.id)),
);
const categories = [...new Set(plants.map((plant) => plant.category))];
const groups = [
  { id: 'featured', label: 'Nổi bật', plants: plants.slice(0, 4) },
  ...categories.map((category) => ({
    id: category,
    label: category,
    plants: plants.filter((plant) => plant.category === category),
  })),
];
const photoTips = [
  {
    title: 'Một lá trong khung hình',
    description: 'Chọn lá có dấu hiệu bạn muốn kiểm tra, giữ máy gần để thấy rõ bề mặt.',
    Icon: ScanLine,
    iconColor: 'text-primary',
  },
  {
    title: 'Đủ sáng, không bị lóa',
    description: 'Ánh sáng tự nhiên giúp giữ đúng màu lá. Tránh bóng tay và đèn flash.',
    Icon: Sun,
    iconColor: 'text-warning',
  },
  {
    title: 'Đối chiếu trước khi xử lý',
    description: 'Đọc tên bệnh, độ tin cậy và quan sát thêm cây ngoài thực tế.',
    Icon: ShieldCheck,
    iconColor: 'text-ring',
  },
];

export function HomePlantGuide({
  onNavigate,
  onSelectPlant,
}: {
  onNavigate: (tab: NavigationTab) => void;
  onSelectPlant: (plant: Plant) => void;
}) {
  return (
    <>
      <section
        aria-labelledby="home-photo-tips-title"
        className="bg-surface-muted px-5 py-12 sm:px-8 md:py-16 lg:px-12"
      >
        <div className="mx-auto max-w-6xl">
          <div className="rounded-media border border-border bg-surface p-5 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Camera aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 id="home-photo-tips-title" className="text-lg font-semibold leading-6">
                    Trước khi chụp ảnh: 3 lưu ý vàng
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Ảnh rõ nét giúp bạn quan sát và đối chiếu kết quả tốt hơn.
                  </p>
                </div>
              </div>
              <span className="self-start rounded-md border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-primary sm:shrink-0 sm:self-center">
                Hướng dẫn chụp ảnh
              </span>
            </div>
            <ol aria-label="Lưu ý chụp ảnh" className="mt-5 grid gap-4 md:grid-cols-3">
              {photoTips.map(({ title, description, Icon, iconColor }, index) => (
                <li
                  key={title}
                  className="rounded-card border border-border bg-surface-muted/50 p-4 motion-safe:transition-[translate,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md motion-safe:active:-translate-y-1 motion-safe:active:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      aria-hidden="true"
                      className="text-3xl font-bold leading-none tabular-nums tracking-tight text-primary"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`flex size-9 items-center justify-center rounded-lg border border-border bg-surface ${iconColor}`}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold leading-6">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="home-plant-guide-title"
        className="bg-surface px-5 py-12 sm:px-8 md:py-16 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <h2
            id="home-plant-guide-title"
            className="text-center text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Tìm hiểu cây bạn đang trồng
          </h2>
          <Tabs defaultValue="featured" className="mt-6 gap-8">
            <TabsList
              variant="line"
              aria-label="Nhóm cây trồng"
              className="mx-auto h-auto max-w-full flex-wrap gap-x-4 gap-y-2"
            >
              {groups.map((group) => (
                <TabsTrigger key={group.id} value={group.id} className="flex-none px-3">
                  {group.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {groups.map((group) => (
              <TabsContent key={group.id} value={group.id}>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {group.plants.map((plant) => (
                    <Card
                      key={plant.id}
                      className="motion-safe:transition-[translate,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md motion-safe:focus-within:-translate-y-1 motion-safe:focus-within:shadow-md motion-safe:active:-translate-y-1 motion-safe:active:shadow-md"
                    >
                      <Image
                        src={plant.imageUrl}
                        alt={plant.name}
                        width={640}
                        height={360}
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="aspect-video w-full object-cover"
                      />
                      <CardHeader>
                        <CardTitle className="text-xl font-semibold">
                          <h3>{plant.name}</h3>
                        </CardTitle>
                        <CardDescription className="min-h-10 text-sm italic">
                          {plant.scientificName}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="mt-auto flex flex-col items-start gap-2">
                        <p className="rounded-sm bg-secondary/50 px-2 py-1 text-xs text-primary">
                          {plant.category}
                        </p>
                        <p className="text-sm leading-6">
                          {plant.conditions.filter((condition) => !condition.isHealthy).length} bệnh
                          lá trong cẩm nang
                        </p>
                      </CardContent>
                      <CardFooter>
                        <Button
                          variant="link"
                          className="px-0 text-sm"
                          aria-label={`Tìm hiểu cây ${plant.name}`}
                          onClick={() => onSelectPlant(plant)}
                        >
                          Xem cẩm nang <ArrowRight aria-hidden="true" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          <div className="mt-8 flex justify-center">
            <Button variant="outline" onClick={() => onNavigate('plants')}>
              Xem tất cả cây trồng <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

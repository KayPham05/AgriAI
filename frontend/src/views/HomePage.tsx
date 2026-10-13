'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Camera, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterSelect } from '@/components/common/CatalogControls';
import { BotanicalBanner } from '@/components/common/BotanicalBanner';
import { SelectionFeedback } from '@/components/common/SelectionFeedback';
import type { NavigationTab, Plant } from '../types';
import { CORE_PLANT_IDS, SUPPORTED_PLANTS } from '../data/plantData';

interface HomeViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectPlant: (plant: Plant) => void;
}

const plants = [...SUPPORTED_PLANTS].sort(
  (left, right) =>
    Number(CORE_PLANT_IDS.includes(right.id)) - Number(CORE_PLANT_IDS.includes(left.id)),
);
const plantOptions = plants.map((plant) => ({ value: plant.id, label: plant.name }));
const photoTips = [
  [
    'Một lá trong khung hình',
    'Chọn lá có dấu hiệu bạn muốn kiểm tra, giữ máy gần để thấy rõ bề mặt.',
  ],
  ['Đủ sáng, không bị lóa', 'Ánh sáng tự nhiên giúp giữ đúng màu lá. Tránh bóng tay và đèn flash.'],
  ['Đối chiếu trước khi xử lý', 'Đọc tên bệnh, độ tin cậy và quan sát thêm cây ngoài thực tế.'],
];

export function HomePage({ onNavigate, onSelectPlant }: HomeViewProps) {
  const [selectedPlantId, setSelectedPlantId] = useState(plants[0].id);
  const selectedPlant = plants.find((plant) => plant.id === selectedPlantId) ?? plants[0];

  return (
    <div>
      <BotanicalBanner caption="Chụp rõ bề mặt lá, giữ cả phần có dấu hiệu bất thường.">
        <div className="min-w-0">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance lg:text-5xl">
            Hiểu từng chiếc lá. <span className="text-primary">Giữ trọn mùa xanh.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            Chọn một ảnh lá rõ nét để phân loại và đối chiếu với thông tin bệnh thường gặp.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button size="lg" onClick={() => onNavigate('diagnose')}>
              <Camera aria-hidden="true" /> Kiểm tra lá
            </Button>
            <Button size="lg" variant="outline" onClick={() => onNavigate('diseases')}>
              <BookOpen aria-hidden="true" /> Tra cứu bệnh
            </Button>
          </div>
        </div>
      </BotanicalBanner>

      <div className="mx-auto max-w-7xl space-y-12 px-5 py-12 sm:px-8 md:space-y-16 lg:px-12">
        <section className="grid gap-6 border-b border-border pb-10 lg:grid-cols-4 lg:gap-12">
          <h2 className="max-w-xs text-2xl font-semibold tracking-tight text-primary">
            Trước khi chụp ảnh
          </h2>
          <ol className="grid gap-6 md:grid-cols-3 lg:col-span-3">
            {photoTips.map(([title, description], index) => (
              <li key={title} className="flex gap-4">
                <span
                  className="border-t-2 border-primary pt-2 text-sm font-semibold tabular-nums text-primary"
                  aria-hidden="true"
                >
                  {index + 1}.
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="grid items-start gap-8 lg:grid-cols-3 lg:gap-12"
          aria-labelledby="plant-guide-title"
        >
          <div>
            <h2
              id="plant-guide-title"
              className="text-3xl font-semibold tracking-tight text-balance"
            >
              Tìm hiểu cây bạn đang trồng
            </h2>
            <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
              Chọn cây để xem đặc điểm và những bệnh lá thường gặp trong cẩm nang.
            </p>
            <div className="mt-6 max-w-sm">
              <FilterSelect
                id="home-plant"
                label="Cây trong cẩm nang"
                value={selectedPlantId}
                options={plantOptions}
                onChange={setSelectedPlantId}
              />
            </div>
            <Button variant="link" className="mt-3 px-0" onClick={() => onNavigate('plants')}>
              Xem danh mục cây <ArrowRight aria-hidden="true" />
            </Button>
          </div>
          <SelectionFeedback
            selectionKey={selectedPlantId}
            mode="preview"
            className="grid min-w-0 gap-6 md:grid-cols-2 lg:col-span-2"
          >
            <Image
              data-selection-photo
              src={selectedPlant.imageUrl}
              alt={selectedPlant.name}
              loading="lazy"
              width={640}
              height={640}
              sizes="(min-width: 1280px) 368px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="aspect-square w-full rounded-media object-cover"
            />
            <div data-selection-copy className="flex min-w-0 flex-col items-start self-center py-2">
              <p className="text-sm font-medium text-primary">{selectedPlant.category}</p>
              <h3 className="mt-2 text-3xl font-semibold">{selectedPlant.name}</h3>
              <p className="mt-1 text-sm italic leading-6 text-muted-foreground">
                {selectedPlant.scientificName}
              </p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {selectedPlant.description}
              </p>
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => onSelectPlant(selectedPlant)}
              >
                Tìm hiểu cây <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </SelectionFeedback>
        </section>
      </div>
    </div>
  );
}

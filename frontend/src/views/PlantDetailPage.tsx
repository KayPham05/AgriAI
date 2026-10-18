import { ArrowLeft, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ReferenceImage } from '@/components/common/ReferenceImage';
import type { Plant } from '../types';
import { ALL_DISEASES } from '../data/plantData';
interface PlantDetailViewProps {
  plant: Plant;
  onBack: () => void;
  onSelectDisease: (diseaseId: string) => void;
  onDiagnosePlant: (plant: Plant) => void;
}
export function PlantDetailPage({
  plant,
  onBack,
  onSelectDisease,
  onDiagnosePlant,
}: PlantDetailViewProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8 lg:px-12">
      <Button variant="ghost" className="px-0" onClick={onBack}>
        <ArrowLeft />
        Quay lại Danh mục Cây trồng
      </Button>
      <section className="grid items-center gap-8 md:grid-cols-2 lg:gap-12">
        <Image
          src={plant.imageUrl}
          alt={plant.name}
          width={640}
          height={480}
          sizes="(min-width: 1280px) 568px, (min-width: 768px) 50vw, 100vw"
          className="aspect-[4/3] w-full rounded-media object-cover"
        />
        <div>
          <p className="text-sm font-medium text-primary">{plant.category}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {plant.name}
          </h1>
          <p className="mt-2 italic text-muted-foreground">{plant.scientificName}</p>
          <p className="mt-5 leading-7 text-muted-foreground">{plant.description}</p>
          <Button className="mt-6" onClick={() => onDiagnosePlant(plant)}>
            Kiểm tra lá <ArrowRight />
          </Button>
        </div>
      </section>
      <section className="border-t border-border pt-8">
        <h2 className="text-2xl font-semibold">Dấu hiệu trên lá tham khảo</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          Các tình trạng lá của {plant.name} được liệt kê để tham khảo trong khi mô hình đang huấn
          luyện.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plant.conditions.map((condition) => (
            <article
              key={condition.id}
              className="flex flex-col overflow-hidden rounded-card border border-border bg-surface"
            >
              <ReferenceImage src={condition.imageUrl} alt={condition.name} />
              <div className="flex flex-1 flex-col items-start p-5">
                <h3 className="text-lg font-semibold">{condition.name}</h3>
                {condition.scientificName && (
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    {condition.scientificName}
                  </p>
                )}
                <p className="my-3 text-sm leading-6 text-muted-foreground">
                  {condition.shortDescription}
                </p>
                {ALL_DISEASES.some((disease) => disease.id === condition.id) && (
                  <Button
                    variant="link"
                    className="mt-auto px-0"
                    onClick={() => onSelectDisease(condition.id)}
                  >
                    Chi tiết bệnh <ArrowRight />
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

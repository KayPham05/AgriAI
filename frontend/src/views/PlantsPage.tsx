import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchField, EmptyResults } from '@/components/common/CatalogControls';
import { SelectionFeedback } from '@/components/common/SelectionFeedback';
import { CatalogPagination } from '@/components/common/CatalogPagination';
import { useCatalogPagination } from '@/hooks/useCatalogPagination';
import type { Plant } from '../types';
import { CORE_PLANT_IDS } from '../data/plantData';

interface PlantsViewProps {
  plants: Plant[];
  onSelectPlant: (plant: Plant) => void;
  onDiagnosePlant: (plant: Plant) => void;
}
const categories = ['Tất cả', 'Cây lương thực', 'Cây ăn trái', 'Cây công nghiệp'];

export function PlantsPage({ plants, onSelectPlant, onDiagnosePlant }: PlantsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const filtered = [...plants]
    .sort((a, b) => {
      const left = CORE_PLANT_IDS.indexOf(a.id);
      const right = CORE_PLANT_IDS.indexOf(b.id);
      return (left < 0 ? 100 : left) - (right < 0 ? 100 : right);
    })
    .filter(
      (plant) =>
        (category === 'Tất cả' || plant.category === category) &&
        (plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          plant.scientificName.toLowerCase().includes(searchQuery.toLowerCase())),
    );

  const pagination = useCatalogPagination(filtered);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
      <h1 className="sr-only">Danh Mục Cây Trồng</h1>
      <div className="mb-7 grid items-end gap-5 lg:grid-cols-2 lg:gap-8">
        <div className="w-full">
          <SearchField
            id="plant-search"
            label="Tìm tên cây hoặc tên khoa học"
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              pagination.resetPage();
            }}
          />
        </div>
        <fieldset className="flex min-w-0 flex-wrap gap-2 lg:justify-end" aria-label="Nhóm cây">
          {categories.map((item) => (
            <Button
              key={item}
              variant={category === item ? 'default' : 'outline'}
              aria-pressed={category === item}
              onClick={() => {
                setCategory(item);
                pagination.resetPage();
              }}
            >
              {item}
            </Button>
          ))}
        </fieldset>
      </div>
      <p
        ref={pagination.resultsRef}
        role="status"
        tabIndex={-1}
        className="mb-5 scroll-mt-24 text-sm text-muted-foreground focus-visible:outline focus-visible:outline-ring"
      >
        Hiển thị {pagination.firstItem}-{pagination.lastItem} trong {filtered.length} cây trong cẩm
        nang
      </p>
      <SelectionFeedback selectionKey={category} mode="results">
        {filtered.length === 0 ? (
          <EmptyResults
            title="Không tìm thấy cây phù hợp"
            onReset={() => {
              setSearchQuery('');
              setCategory('Tất cả');
              pagination.resetPage();
            }}
          />
        ) : (
          <div className="grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {pagination.visibleItems.map((plant) => (
              <article key={plant.id} className="flex min-w-0 flex-col">
                <Button
                  variant="ghost"
                  onClick={() => onSelectPlant(plant)}
                  className="catalog-media h-auto w-full overflow-hidden rounded-media bg-surface-muted p-0"
                  aria-label={`Xem chi tiết ${plant.name}`}
                >
                  <Image
                    src={plant.imageUrl}
                    alt={plant.name}
                    loading="lazy"
                    width={640}
                    height={480}
                    sizes="(min-width: 1280px) 368px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </Button>
                <div className="flex flex-1 flex-col pt-4">
                  <p className="text-sm font-medium text-primary">{plant.category}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{plant.name}</h2>
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    {plant.scientificName}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {plant.description}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4 pt-5">
                    <Button variant="link" className="px-0" onClick={() => onSelectPlant(plant)}>
                      Chi tiết <ArrowRight />
                    </Button>
                    <Button variant="outline" onClick={() => onDiagnosePlant(plant)}>
                      Kiểm tra lá
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SelectionFeedback>
      <CatalogPagination
        label="Phân trang cây trồng"
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={pagination.changePage}
      />
    </div>
  );
}

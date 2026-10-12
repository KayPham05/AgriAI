import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReferenceImage } from '@/components/common/ReferenceImage';
import { SearchField, FilterSelect, EmptyResults } from '@/components/common/CatalogControls';
import { SelectionFeedback } from '@/components/common/SelectionFeedback';
import { CatalogPagination } from '@/components/common/CatalogPagination';
import { useCatalogPagination } from '@/hooks/useCatalogPagination';
import type { Disease } from '../types';

interface DiseasesViewProps {
  diseases: Disease[];
  onSelectDisease: (disease: Disease) => void;
  onDiagnoseDiseasePlant: (plantName: string) => void;
}
const categoryLabels: Record<string, string> = {
  Fungal: 'Nấm',
  Bacterial: 'Vi khuẩn',
  Viral: 'Virus',
  Physiological: 'Sinh lý',
  Healthy: 'Khỏe mạnh',
};
const categories = ['Tất cả', 'Nấm', 'Vi khuẩn', 'Virus'];
export function DiseasesPage({
  diseases,
  onSelectDisease,
  onDiagnoseDiseasePlant,
}: DiseasesViewProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [plant, setPlant] = useState('Tất cả');
  const plantOptions = ['Tất cả', ...new Set(diseases.map((item) => item.plant))].map((value) => ({
    value,
    label: value,
  }));
  const filtered = diseases.filter((item) => {
    const query = search.toLowerCase();
    return (
      (category === 'Tất cả' || (categoryLabels[item.category] ?? item.category) === category) &&
      (plant === 'Tất cả' || item.plant === plant) &&
      [item.name, item.plant, item.scientificName ?? ''].some((value) =>
        value.toLowerCase().includes(query),
      )
    );
  });

  const pagination = useCatalogPagination(filtered);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
      <header className="border-b border-border pb-7">
        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Cẩm Nang Bệnh Hại Cây
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Thông tin tham khảo về triệu chứng và cách phòng ngừa. Khi bệnh lan nhanh, hãy liên hệ cán
          bộ bảo vệ thực vật địa phương.
        </p>
      </header>
      <div className="my-7 grid items-end gap-5 xl:grid-cols-3 xl:gap-8">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end xl:col-span-2">
          <SearchField
            id="disease-search"
            label="Tìm tên bệnh hoặc cây trồng"
            value={search}
            onChange={(value) => {
              setSearch(value);
              pagination.resetPage();
            }}
          />
          <FilterSelect
            id="disease-plant"
            label="Cây trồng"
            value={plant}
            options={plantOptions}
            onChange={(value) => {
              setPlant(value);
              pagination.resetPage();
            }}
          />
        </div>
        <fieldset className="flex min-w-0 flex-wrap gap-2 xl:justify-end" aria-label="Nhóm bệnh">
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
        Hiển thị {pagination.firstItem}-{pagination.lastItem} trong {filtered.length} mục tham khảo
      </p>
      <SelectionFeedback selectionKey={`${category}:${plant}`} mode="results">
        {filtered.length === 0 ? (
          <EmptyResults
            title="Không tìm thấy bệnh hại phù hợp"
            onReset={() => {
              setSearch('');
              setCategory('Tất cả');
              setPlant('Tất cả');
              pagination.resetPage();
            }}
          />
        ) : (
          <div className="grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {pagination.visibleItems.map((item) => (
              <article key={item.id} className="flex min-w-0 flex-col">
                <Button
                  variant="ghost"
                  onClick={() => onSelectDisease(item)}
                  className="catalog-media h-auto w-full overflow-hidden rounded-media bg-surface-muted p-0"
                  aria-label={`Xem chi tiết ${item.name}`}
                >
                  <ReferenceImage src={item.heroImage} alt={item.name} />
                </Button>
                <div className="flex flex-1 flex-col pt-4">
                  <p className="text-sm font-medium text-primary">
                    {item.plant} · {categoryLabels[item.category] ?? item.category}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">{item.name}</h2>
                  {item.scientificName && (
                    <p className="mt-1 text-sm italic text-muted-foreground">
                      {item.scientificName}
                    </p>
                  )}
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {item.overview}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4 pt-5">
                    <Button variant="link" className="px-0" onClick={() => onSelectDisease(item)}>
                      Chi tiết <ArrowRight />
                    </Button>
                    <Button variant="outline" onClick={() => onDiagnoseDiseasePlant(item.plant)}>
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
        label="Phân trang bệnh"
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={pagination.changePage}
      />
    </div>
  );
}

import { useState } from 'react';
import Image from 'next/image';
import { CROP_PHOTOS } from '@/data/cropPhotos';
import { LayoutGrid, List, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchField, FilterSelect, EmptyResults } from '@/components/common/CatalogControls';
import type { DiagnosisResult } from '../types';
import { DeleteConfirmModal } from '../components/modals/DeleteConfirmModal';

interface HistoryViewProps {
  history: DiagnosisResult[];
  onSelectResult: (result: DiagnosisResult) => void;
  onDeleteResult: (id: string) => void;
  onNavigateDiagnose: () => void;
}

export function HistoryPage({
  history,
  onSelectResult,
  onDeleteResult,
  onNavigateDiagnose,
}: HistoryViewProps) {
  const [search, setSearch] = useState('');
  const [plant, setPlant] = useState('Tất cả');
  const [result, setResult] = useState('All');
  const [view, setView] = useState<'cards' | 'list'>('list');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const options = ['Tất cả', ...new Set(history.map((item) => item.plant))].map((value) => ({
    value,
    label: value,
  }));
  const filtered = history.filter(
    (item) =>
      (plant === 'Tất cả' || item.plant === plant) &&
      (result === 'All' || (result === 'Healthy' ? item.isHealthy : !item.isHealthy)) &&
      [item.plant, item.prediction].some((value) =>
        value.toLowerCase().includes(search.toLowerCase()),
      ),
  );

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
      <header className="flex flex-col items-start justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">Mẫu đã lưu</h1>
          <p className="mt-3 text-muted-foreground">
            Xem lại ảnh lá và kết quả phân loại. Hiện có {history.length} mẫu.
          </p>
        </div>
        <Button onClick={onNavigateDiagnose}>
          Kiểm tra lá <ArrowRight />
        </Button>
      </header>
      {history.length > 0 && (
        <div className="my-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <SearchField
            id="history-search"
            label="Tìm cây hoặc tên bệnh"
            value={search}
            onChange={setSearch}
          />
          <FilterSelect
            id="history-plant"
            label="Cây trồng"
            value={plant}
            options={options}
            onChange={setPlant}
          />
          <FilterSelect
            id="history-result"
            label="Kết quả"
            value={result}
            onChange={setResult}
            options={[
              { value: 'All', label: 'Tất cả kết quả' },
              { value: 'Healthy', label: 'Dự đoán khỏe mạnh' },
              { value: 'Diseased', label: 'Dự đoán có bệnh' },
            ]}
          />
          <fieldset className="flex min-w-0 gap-1" aria-label="Cách hiển thị">
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              aria-label="Dạng danh sách"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              <List />
            </Button>
            <Button
              variant={view === 'cards' ? 'secondary' : 'ghost'}
              size="icon"
              aria-label="Dạng lưới"
              aria-pressed={view === 'cards'}
              onClick={() => setView('cards')}
            >
              <LayoutGrid />
            </Button>
          </fieldset>
        </div>
      )}
      {history.length === 0 ? (
        <div className="mt-8 grid overflow-hidden rounded-media bg-surface-muted md:grid-cols-2">
          <Image
            src={CROP_PHOTOS.rice.imageSrc}
            alt={CROP_PHOTOS.rice.imageAlt}
            width={1536}
            height={1024}
            sizes="(min-width: 1280px) 592px, (min-width: 768px) 50vw, 100vw"
            className="aspect-[4/3] size-full max-h-80 object-cover"
          />
          <div className="flex flex-col justify-center p-6 sm:p-10">
            <h2 className="text-2xl font-semibold text-primary">Chưa có mẫu nào được lưu</h2>
            <p className="mt-3 max-w-sm leading-7 text-muted-foreground">
              Bắt đầu với một ảnh lá. Bạn có thể xem lại kết quả tại đây.
            </p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyResults
          title="Không tìm thấy kết quả phù hợp"
          onReset={() => {
            setSearch('');
            setPlant('Tất cả');
            setResult('All');
          }}
        />
      ) : (
        <div
          className={
            view === 'cards'
              ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3'
              : 'divide-y divide-border border-y border-border'
          }
        >
          {filtered.map((item) => (
            <article
              key={item.id}
              className={
                view === 'cards'
                  ? 'overflow-hidden rounded-card border border-border bg-surface'
                  : 'flex flex-wrap items-center gap-4 py-5'
              }
            >
              <Button
                variant="ghost"
                className={
                  view === 'cards'
                    ? 'h-auto w-full rounded-none p-0'
                    : 'size-20 shrink-0 overflow-hidden rounded-xl p-0'
                }
                onClick={() => onSelectResult(item)}
                aria-label={`Xem kết quả ${item.prediction}`}
              >
                <Image
                  unoptimized
                  width={640}
                  height={480}
                  src={item.originalImageUrl}
                  alt={item.prediction}
                  loading="lazy"
                  className={
                    view === 'cards' ? 'aspect-[4/3] w-full object-cover' : 'size-full object-cover'
                  }
                />
              </Button>
              <div className={view === 'cards' ? 'space-y-3 p-5' : 'min-w-0 flex-1'}>
                <p className="text-sm text-muted-foreground">{item.plant}</p>
                <h2 className="mt-1 break-words text-lg font-semibold">{item.prediction}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.timestamp}</p>
                <p className="mt-2 text-sm">
                  Độ tin cậy:{' '}
                  <span className="font-semibold tabular-nums">
                    {Math.round(item.confidence * 1000) / 10}%
                  </span>
                  {item.isDemo && (
                    <span className="ml-2 font-medium text-foreground">Dữ liệu minh họa</span>
                  )}
                </p>
              </div>
              <div
                className={
                  view === 'cards'
                    ? 'flex justify-between gap-2 px-5 pb-5'
                    : 'flex w-full justify-end gap-2 sm:w-auto'
                }
              >
                <Button variant="outline" onClick={() => onSelectResult(item)}>
                  Xem chi tiết
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={`Xóa kết quả ${item.prediction}`}
                  onClick={() => setPendingDeleteId(item.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <DeleteConfirmModal
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) {
            onDeleteResult(pendingDeleteId);
            setPendingDeleteId(null);
          }
        }}
      />
    </div>
  );
}

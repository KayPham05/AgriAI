'use client';
import { useEffect, useState } from 'react';
import { catalogRequest, loadAllPairs, type PlantDiseasePair } from '@/services/knowledgeApi';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/common/CatalogControls';
import { catalogError } from './catalogUi';
import { ConfirmAction } from './CatalogControls';

export function PlantDiseaseManager({ token }: { token: string }) {
  const [pairs, setPairs] = useState<PlantDiseasePair[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<PlantDiseasePair | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is the user's explicit retry signal.
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    loadAllPairs(token, controller.signal)
      .then((items) => {
        if (active) setPairs(items);
      })
      .catch((failure) => {
        if (active) setError(catalogError(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [token, revision]);
  async function toggle(pair: PlantDiseasePair) {
    setPending(true);
    setError('');
    try {
      const result = await catalogRequest<PlantDiseasePair>(
        `/api/admin/plant-diseases/${pair.id}/availability`,
        { token, method: 'PUT', body: { isActive: !pair.isActive } },
      );
      setPairs((current) => current.map((item) => (item.id === result.id ? result : item)));
    } catch (failure) {
      setError(catalogError(failure));
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6">
      <p className="text-muted-foreground">
        Quản lý hoạt động của các cặp hiện có. Mã lớp AI chỉ được xem, không chỉnh sửa tại đây.
      </p>
      <div className="shrink-0">
        <SearchField
          id="pair-search"
          label="Tìm cây hoặc bệnh"
          value={search}
          onChange={setSearch}
        />
      </div>
      {loading && <p role="status">Đang tải liên kết...</p>}
      {error && (
        <p role="alert">
          {error}
          <Button
            variant="outline"
            onClick={() => {
              setError('');
              setRevision((value) => value + 1);
            }}
          >
            Thử lại
          </Button>
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {pairs
          .filter((pair) =>
            `${pair.plantName} ${pair.diseaseName}`
              .toLocaleLowerCase('vi')
              .includes(search.toLocaleLowerCase('vi')),
          )
          .map((pair) => (
            <li
              key={pair.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4"
            >
              <div className="min-w-0">
                <h2 className="font-semibold">
                  {pair.plantName} / {pair.diseaseName}
                </h2>
                <p className="break-all text-sm text-muted-foreground">
                  {pair.className} ({pair.classIndex})
                </p>
              </div>
              <Button variant="outline" disabled={pending} onClick={() => setSelected(pair)}>
                {pair.isActive ? 'Ngừng liên kết' : 'Khôi phục liên kết'}
              </Button>
            </li>
          ))}
      </ul>
      {selected && (
        <ConfirmAction
          text={`${selected.isActive ? 'Ngừng' : 'Khôi phục'} liên kết ${selected.plantName} / ${selected.diseaseName}? Thao tác ảnh hưởng nội dung tra cứu liên quan.`}
          onClose={() => setSelected(null)}
          onConfirm={() => void toggle(selected)}
        />
      )}
    </section>
  );
}

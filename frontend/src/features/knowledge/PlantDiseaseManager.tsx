'use client';
import { useEffect, useState } from 'react';
import {
  catalogRequest,
  loadAllPairs,
  recordName,
  type CatalogRecord,
  type PlantDiseasePair,
} from '@/services/knowledgeApi';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/common/CatalogControls';
import { catalogError } from './catalogUi';
import { CatalogPager, ConfirmAction } from './CatalogControls';
import { SearchableCatalogSelect } from './SearchableCatalogSelect';
import { rankCatalog } from '@/lib/catalogText';

const PAGE_SIZE = 20;

export function PlantDiseaseManager({
  token,
  plantId,
  disabled = false,
  plantActive = true,
  onBusyChange,
  onChange,
}: {
  token: string;
  plantId: string;
  disabled?: boolean;
  plantActive?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onChange?: (pair: PlantDiseasePair) => void;
}) {
  const [pairs, setPairs] = useState<PlantDiseasePair[]>([]);
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<PlantDiseasePair | null>(null);
  const [diseases, setDiseases] = useState<CatalogRecord[]>([]);
  const [newDisease, setNewDisease] = useState('');
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is the user's explicit retry signal.
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      loadAllPairs(token, controller.signal),
      catalogRequest<CatalogRecord[]>('/api/diseases', { token, signal: controller.signal }),
    ])
      .then(([items, available]) => {
        if (active) {
          setPairs(items);
          setDiseases(available);
        }
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
  async function link() {
    if (disabled || pending || !plantActive || !newDisease) return;
    setPending(true);
    onBusyChange?.(true);
    setError('');
    try {
      const result = await catalogRequest<PlantDiseasePair>('/api/admin/plant-diseases', {
        token,
        method: 'POST',
        body: { plantId, diseaseId: newDisease },
      });
      setPairs((current) => [...current.filter((pair) => pair.id !== result.id), result]);
      setNewDisease('');
      setSearch('');
      onChange?.(result);
    } catch (failure) {
      setError(catalogError(failure));
    } finally {
      setPending(false);
      onBusyChange?.(false);
    }
  }
  async function toggle(pair: PlantDiseasePair) {
    if (disabled || pending || pair.plantId !== plantId) return;
    setPending(true);
    onBusyChange?.(true);
    setError('');
    try {
      const result = await catalogRequest<PlantDiseasePair>(
        `/api/admin/plant-diseases/${pair.id}/availability`,
        { token, method: 'PUT', body: { isActive: !pair.isActive } },
      );
      setPairs((current) => current.map((item) => (item.id === result.id ? result : item)));
      onChange?.(result);
    } catch (failure) {
      setError(catalogError(failure));
    } finally {
      setPending(false);
      onBusyChange?.(false);
    }
  }
  const filtered = rankCatalog(
    pairs.filter((pair) => pair.plantId === plantId),
    search,
    (pair) => `${pair.plantName} ${pair.diseaseName} ${pair.className ?? ''}`,
  );
  const available = diseases.filter(
    (disease) =>
      disease.isActive &&
      !pairs.some((pair) => pair.plantId === plantId && pair.diseaseId === disease.id),
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(pageNumber, Math.max(1, totalPages));
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  return (
    <section
      aria-label="Bệnh và tình trạng liên quan"
      className="flex flex-col gap-4 border-t border-border pt-5"
    >
      <h3 className="text-lg font-semibold">Bệnh và tình trạng liên quan</h3>
      <p className="text-muted-foreground">
        Có thể ngừng liên kết cũ hoặc thêm bệnh, tình trạng khác. Liên kết mới dùng cho tra cứu; dự
        đoán chỉ hỗ trợ các cặp đã có trong mô hình.
      </p>
      <fieldset
        disabled={disabled || pending || loading || !plantActive}
        className="flex min-w-0 flex-col gap-3 rounded-card border border-border p-4"
      >
        <legend className="px-2 font-semibold">Thêm liên kết</legend>
        <SearchableCatalogSelect
          label="Bệnh hoặc tình trạng mới"
          searchLabel="Tìm bệnh hoặc tình trạng để liên kết"
          placeholder="Chọn bệnh hoặc tình trạng"
          emptyMessage={
            available.length
              ? 'Không tìm thấy bệnh hoặc tình trạng phù hợp.'
              : 'Không còn bệnh hoặc tình trạng chưa liên kết. Bạn có thể khôi phục liên kết cũ bên dưới.'
          }
          value={newDisease}
          onChange={setNewDisease}
          options={available.map((disease) => ({
            id: disease.id,
            label: recordName(disease),
            searchText: `${recordName(disease)} ${disease.name ?? ''}`,
          }))}
          disabled={disabled || pending || loading || !plantActive}
        />
        <Button
          type="button"
          className="self-start"
          disabled={disabled || pending || !newDisease || !plantActive}
          onClick={() => void link()}
        >
          {pending ? 'Đang lưu...' : 'Thêm liên kết'}
        </Button>
        {!plantActive && (
          <p className="text-sm text-muted-foreground">
            Khôi phục hoạt động cây trước khi thêm hoặc khôi phục liên kết.
          </p>
        )}
      </fieldset>
      <div className="shrink-0">
        <SearchField
          id="pair-search"
          label="Tìm bệnh hoặc tình trạng"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPageNumber(1);
          }}
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
        {visible.map((pair) => (
          <li
            key={pair.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4"
          >
            <div className="min-w-0">
              <h4 className="font-semibold">
                {pair.plantName} / {pair.diseaseName}
              </h4>
              <p className="break-all text-sm text-muted-foreground">
                {pair.className ? `${pair.className} (${pair.classIndex})` : 'Liên kết tra cứu'}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={
                disabled ||
                pending ||
                (!pair.isActive && (!plantActive || pair.diseaseIsActive === false))
              }
              onClick={() => setSelected(pair)}
            >
              {pair.isActive ? 'Ngừng liên kết' : 'Khôi phục liên kết'}
            </Button>
          </li>
        ))}
      </ul>
      {!loading && !error && (
        <>
          {filtered.length === 0 && <p>Không tìm thấy liên kết phù hợp.</p>}
          <CatalogPager
            page={currentPage}
            totalPages={totalPages}
            totalCount={filtered.length}
            onChange={setPageNumber}
          />
        </>
      )}
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

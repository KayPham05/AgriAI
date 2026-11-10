'use client';
import { useRef, useState } from 'react';
import { catalogRequest, type CatalogRecord, type PlantDiseasePair } from '@/services/knowledgeApi';
import { PlantDiseasePicker } from './PlantDiseasePicker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmAction } from './CatalogControls';
import { catalogError } from './catalogUi';

function unavailableReason(pair: PlantDiseasePair | undefined): string {
  if (!pair) return 'Không tìm thấy thông tin cặp cây và bệnh. Vui lòng tải lại danh mục.';
  if (!pair.isActive || pair.plantIsActive === false || pair.diseaseIsActive === false)
    return 'Cây, bệnh hoặc liên kết đã ngừng hoạt động. Khôi phục tại danh mục tương ứng trước khi lưu hướng dẫn.';
  if (pair.conditionType === 'Healthy')
    return 'Cặp này thuộc nhóm Khỏe mạnh, không được gắn hướng dẫn thuốc.';
  if (pair.conditionType === 'NutrientDeficiency')
    return 'Cặp này thuộc nhóm Thiếu dinh dưỡng, không được gắn hướng dẫn thuốc.';
  if (pair.conditionType !== 'Disease')
    return `${pair.diseaseName} chưa được phân loại là Bệnh. Kiểm tra Phân loại tình trạng tại Quản lý bệnh cây.`;
  if (pair.plantIsActive !== true || pair.diseaseIsActive !== true)
    return 'Chưa có đủ thông tin hoạt động của cây và bệnh. Vui lòng tải lại danh mục.';
  return '';
}

export function MedicineUses({
  record,
  pairs,
  token,
  onRefresh,
  onBusyChange,
  disabled,
}: {
  record: CatalogRecord;
  pairs: PlantDiseasePair[];
  token: string;
  onRefresh: () => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const [pairId, setPairId] = useState('');
  const [directions, setDirections] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState('');
  const [remove, setRemove] = useState(false);
  const use = record.uses?.find((item) => item.plantDiseaseId === pairId);
  const pair = pairs.find((item) => item.id === pairId);
  const unavailable = pairId ? unavailableReason(pair) : '';
  const applied = record.uses?.map((item) => item.plantDiseaseId) ?? [];
  async function mutate(action: 'save' | 'remove') {
    if (busy.current || disabled || !pairId) return;
    if (action !== 'remove' && unavailable) {
      setError(unavailable);
      return;
    }
    if (action !== 'remove' && !directions.trim()) {
      setError('Vui lòng nhập hướng dẫn trên nhãn.');
      return;
    }
    busy.current = true;
    onBusyChange?.(true);
    setPending(true);
    setError('');
    try {
      await catalogRequest(`/api/admin/medicines/${record.id}/uses/${pairId}`, {
        token,
        method: action === 'remove' ? 'DELETE' : 'PUT',
        body: action === 'remove' ? undefined : { labelDirections: directions.trim() },
      });
      await onRefresh();
      setPairId('');
      setDirections('');
    } catch (failure) {
      setError(catalogError(failure));
    } finally {
      busy.current = false;
      onBusyChange?.(false);
      setPending(false);
    }
  }
  function choose(id: string) {
    setPairId(id);
    setDirections(record.uses?.find((item) => item.plantDiseaseId === id)?.labelDirections ?? '');
    setError('');
  }
  return (
    <section
      className="flex flex-col gap-4 border-t border-border pt-5"
      aria-label="Cây, bệnh áp dụng và cách dùng"
    >
      <h3 className="text-xl font-bold">Cây, bệnh áp dụng và cách dùng</h3>
      <p className="text-sm text-muted-foreground">
        Mỗi cặp cây và bệnh chỉ gắn một hướng dẫn. Cặp đã áp dụng không còn trong danh sách chọn.
      </p>
      <ul className="flex flex-col gap-3">
        {record.uses?.map((item) => {
          const pair = pairs.find((entry) => entry.id === item.plantDiseaseId);
          const name = pair ? `${pair.plantName} / ${pair.diseaseName}` : item.plantDiseaseId;
          return (
            <li
              key={item.plantDiseaseId}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3"
            >
              <p className="min-w-0 break-words font-semibold">{name}</p>
              <Button
                variant="outline"
                className="h-auto min-h-11 max-w-full whitespace-normal break-words text-left"
                disabled={pending || disabled}
                onClick={() => choose(item.plantDiseaseId)}
              >
                Sửa hướng dẫn {name}
              </Button>
            </li>
          );
        })}
      </ul>
      <fieldset disabled={pending || disabled} className="flex min-w-0 flex-col gap-4">
        <legend className="sr-only">Biên tập hướng dẫn</legend>
        <PlantDiseasePicker
          pairs={pairs}
          value={pairId}
          excludeIds={applied}
          onChange={choose}
          disabled={pending || disabled}
        />
        {pairId && (
          <>
            {unavailable && (
              <p role="alert" className="text-destructive">
                {unavailable}
              </p>
            )}
            <Label htmlFor="medicine-label-directions">Hướng dẫn trên nhãn</Label>
            <Textarea
              id="medicine-label-directions"
              value={directions}
              onChange={(event) => setDirections(event.target.value)}
              rows={5}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={pending || disabled || Boolean(unavailable)}
                onClick={() => void mutate('save')}
              >
                Lưu hướng dẫn
              </Button>
              {use && (
                <Button
                  variant="outline"
                  disabled={pending || disabled}
                  onClick={() => setRemove(true)}
                >
                  Gỡ liên kết
                </Button>
              )}
            </div>
          </>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {remove && (
        <ConfirmAction
          text="Gỡ hướng dẫn của thuốc khỏi cặp cây và bệnh này?"
          onClose={() => setRemove(false)}
          onConfirm={() => void mutate('remove')}
        />
      )}
    </section>
  );
}

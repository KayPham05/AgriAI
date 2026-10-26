'use client';
import { useRef, useState } from 'react';
import { catalogRequest, type CatalogRecord, type PlantDiseasePair } from '@/services/knowledgeApi';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CatalogSelect, ConfirmAction } from './CatalogControls';
import { catalogError } from './catalogUi';

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
  const changed = directions.trim() !== (use?.labelDirections ?? '');
  async function mutate(action: 'save' | 'verify' | 'approve' | 'remove') {
    if (busy.current || disabled || !pairId) return;
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
        body:
          action === 'remove'
            ? undefined
            : {
                labelDirections: directions.trim(),
                ...(action === 'verify' ? { isLabelVerified: true } : {}),
                ...(action === 'approve' ? { isApproved: true } : {}),
              },
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
      aria-label="Hướng dẫn sử dụng theo cây và bệnh"
    >
      <h3 className="text-xl font-bold">Đối tượng sử dụng và nhãn</h3>
      <p className="text-sm text-muted-foreground">
        Lưu hướng dẫn trước. Sau khi đối soát nhãn, xác minh và duyệt bằng thao tác riêng.
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
              <div className="min-w-0">
                <p className="break-words font-semibold">{name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.isLabelVerified ? 'Đã xác minh nhãn' : 'Chưa xác minh nhãn'};{' '}
                  {item.isApproved ? 'Liên kết đã duyệt' : 'Liên kết chưa duyệt'}
                </p>
              </div>
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
        <CatalogSelect
          label="Chọn cặp cây và bệnh"
          value={pairId}
          onChange={choose}
          options={pairs
            .filter((pair) => pair.isActive || pair.id === pairId)
            .map((pair) => ({
              value: pair.id,
              label: `${pair.plantName} / ${pair.diseaseName}${pair.isActive ? '' : ' (ngừng hoạt động)'}`,
            }))}
          disabled={pending || disabled}
        />
        {pairId && (
          <>
            <Label htmlFor="medicine-label-directions">Hướng dẫn trên nhãn</Label>
            <Textarea
              id="medicine-label-directions"
              value={directions}
              onChange={(event) => setDirections(event.target.value)}
              rows={5}
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={pending || disabled} onClick={() => void mutate('save')}>
                Lưu hướng dẫn
              </Button>
              <Button
                variant="outline"
                disabled={pending || disabled || !use || changed || use.isLabelVerified}
                onClick={() => void mutate('verify')}
              >
                Xác minh nhãn
              </Button>
              <Button
                variant="outline"
                disabled={pending || disabled || !use?.isLabelVerified || changed || use.isApproved}
                onClick={() => void mutate('approve')}
              >
                Duyệt liên kết
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
            {changed && (
              <p className="text-sm text-muted-foreground">
                Cần lưu thay đổi trước khi xác minh hoặc duyệt.
              </p>
            )}
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

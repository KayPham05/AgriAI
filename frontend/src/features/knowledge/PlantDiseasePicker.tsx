'use client';
import type { PlantDiseasePair } from '@/services/knowledgeApi';
import { SearchableCatalogSelect } from './SearchableCatalogSelect';

export function PlantDiseasePicker({
  pairs,
  value,
  excludeIds,
  onChange,
  disabled,
}: {
  pairs: PlantDiseasePair[];
  value: string;
  excludeIds?: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const selected = pairs.find((pair) => pair.id === value);
  const options = pairs.filter(
    (pair) =>
      pair.isActive &&
      pair.plantIsActive === true &&
      pair.diseaseIsActive === true &&
      pair.conditionType === 'Disease' &&
      (pair.id === value || !excludeIds?.includes(pair.id)),
  );
  return (
    <SearchableCatalogSelect
      label="Chọn cặp cây và bệnh"
      searchLabel="Tìm cặp cây và bệnh"
      placeholder="Chọn cặp cây và bệnh"
      emptyMessage="Không tìm thấy cặp cây và bệnh phù hợp."
      options={options.map((pair) => ({
        id: pair.id,
        label: `${pair.plantName} / ${pair.diseaseName}`,
        searchText: `${pair.plantName} ${pair.diseaseName} ${pair.className ?? ''}`,
      }))}
      value={value}
      onChange={onChange}
      disabled={disabled}
      selectedLabel={selected ? `${selected.plantName} / ${selected.diseaseName}` : undefined}
    />
  );
}

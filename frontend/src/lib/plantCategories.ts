export const PLANT_CATEGORIES = [
  'Cây lương thực',
  'Cây công nghiệp',
  'Cây ăn trái',
  'Khác',
] as const;
export type PlantCategory = (typeof PLANT_CATEGORIES)[number];

export function plantCategory(value: string | null | undefined): PlantCategory {
  return PLANT_CATEGORIES.find((category) => category === value) ?? 'Khác';
}

import { ALL_DISEASES, SUPPORTED_PLANTS } from '../data/plantData';
import { LEAF_PHOTOS, LEAF_PHOTO_NOTE } from '../data/leafPhotos';
import type { Disease, Plant } from '../types';

export interface PlantDto {
  id: string;
  name: string;
  vietnameseName: string | null;
  scientificName: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface DiseaseDto {
  id: string;
  name: string;
  vietnameseName: string | null;
  description: string | null;
  symptoms: string | null;
  treatment: string | null;
  prevention: string | null;
  isActive: boolean;
  createdAt: string;
}

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';

// Canonical Vietnamese catalog keys and legacy names share the same local photo.
const plantIdAliases: Record<string, string> = {
  cachua: 'tomato',
  caphe: 'coffee',
  cam: 'orange',
  che: 'tea',
  lua: 'rice',
  ngo: 'corn',
  ot: 'chili',
  pepper: 'chili',
  saurieng: 'durian',
  xoai: 'mango',
  chuoi: 'banana',
  khoaitay: 'potato',
  duahau: 'watermelon',
  buoi: 'pomelo',
  nho: 'grape',
};

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('vi')
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function splitContent(value: string | null, fallback: string[]): string[] {
  if (!value?.trim()) return fallback;
  return value
    .split(/\r?\n|;|\.(?:\s+|$)/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${configuredBaseUrl}${path}`);
  if (!response.ok) throw new Error(`Backend trả về lỗi ${response.status}.`);
  return response.json() as Promise<T>;
}

export async function getPlants(): Promise<Plant[]> {
  const records = await fetchJson<PlantDto[]>('/api/plants');
  const plants = records
    .filter((record) => record.isActive)
    .map((record) => {
      const catalogId =
        plantIdAliases[normalize(record.name)] ??
        plantIdAliases[normalize(record.vietnameseName ?? '')] ??
        normalize(record.name);
      const template = SUPPORTED_PLANTS.find(
        (plant) =>
          normalize(plant.id) === catalogId ||
          normalize(plant.name) === normalize(record.vietnameseName ?? record.name),
      );

      return {
        ...(template ?? {
          id: normalize(record.name),
          name: record.vietnameseName ?? record.name,
          scientificName: record.scientificName ?? '',
          category: 'Khác' as const,
          description: record.description ?? 'Thông tin cây trồng từ hệ thống AgriAI.',
          imageUrl: '/images/agriai-leaf-mark.png',
          detectableCount: 0,
          conditions: [],
        }),
        backendId: record.id,
        name: record.vietnameseName ?? template?.name ?? record.name,
        scientificName: record.scientificName ?? template?.scientificName ?? '',
        description:
          record.description ?? template?.description ?? 'Thông tin cây trồng từ hệ thống AgriAI.',
      };
    });
  // These existing cẩm-nang crops are not additional model labels or active backend rows.
  const referenceIds = ['pomelo', 'potato', 'banana', 'watermelon'];
  const references = referenceIds.flatMap((id) => {
    const template = SUPPORTED_PLANTS.find((plant) => plant.id === id);
    if (!template || plants.some((plant) => plant.id === id)) return [];
    return [
      {
        ...template,
        detectableCount: 0,
        description: `Cây tham khảo ngoài danh mục mô hình v1.4 đang hoạt động. ${template.description}`,
      },
    ];
  });
  return [...plants, ...references];
}

const diseaseIdHints: Record<string, string[]> = {
  healthy: ['healthy'],
  earlyblight: ['early-blight'],
  chaylasom: ['early-blight'],
  lateblight: ['late-blight'],
  bacterialspot: ['bacterial-spot'],
  yellowleafcurlvirus: ['leaf-curl-virus', 'yellow-leaf-curl'],
};

const leafConditionAliases: Record<string, string> = {
  'tea-algal-spot': 'Dom_tao',
  'durian-algal-spot': 'Dom_tao',
  'tea-brown-leaf-blight': 'Chay_la_nau',
  'tea-brown-blight': 'Than_thu',
};

export async function getDiseases(): Promise<Disease[]> {
  const records = await fetchJson<DiseaseDto[]>('/api/diseases');
  return ALL_DISEASES.map((disease) => {
    const photo = LEAF_PHOTOS.find(
      (item) => item.id === disease.id && item.plantId === disease.plantId,
    );
    const record = records.find((candidate) => {
      const hints = diseaseIdHints[normalize(candidate.name)] ?? [];
      const candidateName = normalize(candidate.vietnameseName?.trim() || candidate.name);
      const photoName = photo ? normalize(leafConditionAliases[photo.id] ?? photo.name) : '';
      return (
        candidate.isActive &&
        (hints.some((hint) => disease.id.includes(hint)) ||
          (photoName !== '' &&
            (photoName === normalize(candidate.name) || photoName === candidateName)) ||
          (!photo && candidateName !== '' && normalize(disease.name).includes(candidateName)))
      );
    });
    if (!record) return disease;

    return {
      ...disease,
      backendId: record.id,
      name: disease.name,
      overview: record.description
        ? `${record.description}${photo ? ` ${LEAF_PHOTO_NOTE}` : ''}`
        : disease.overview,
      symptoms: splitContent(record.symptoms, disease.symptoms),
      prevention: splitContent(record.prevention, disease.prevention),
      management: splitContent(record.treatment, disease.management),
    };
  });
}

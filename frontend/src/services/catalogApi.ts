import { ALL_DISEASES, SUPPORTED_PLANTS } from '../data/plantData';
import { Disease, Plant } from '../types';

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

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function splitContent(value: string | null, fallback: string[]): string[] {
  if (!value?.trim()) return fallback;
  return value.split(/\r?\n|;|\.(?:\s+|$)/).map((item) => item.trim()).filter(Boolean);
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${configuredBaseUrl}${path}`);
  if (!response.ok) throw new Error(`Backend trả về lỗi ${response.status}.`);
  return response.json() as Promise<T>;
}

export async function getPlants(): Promise<Plant[]> {
  const records = await fetchJson<PlantDto[]>('/api/plants');
  return records.filter((record) => record.isActive).map((record) => {
    const template = SUPPORTED_PLANTS.find((plant) =>
      normalize(plant.id) === normalize(record.name)
      || normalize(plant.name) === normalize(record.vietnameseName ?? record.name));

    return {
      ...(template ?? {
        id: normalize(record.name),
        name: record.vietnameseName ?? record.name,
        scientificName: record.scientificName ?? '',
        category: 'Khác' as const,
        description: record.description ?? 'Thông tin cây trồng từ hệ thống LeafAI.',
        imageUrl: '/images/logo.png',
        detectableCount: 0,
        conditions: [],
      }),
      backendId: record.id,
      name: record.vietnameseName ?? template?.name ?? record.name,
      scientificName: record.scientificName ?? template?.scientificName ?? '',
      description: record.description ?? template?.description ?? 'Thông tin cây trồng từ hệ thống LeafAI.',
    };
  });
}

const diseaseIdHints: Record<string, string[]> = {
  healthy: ['healthy'],
  earlyblight: ['early-blight'],
  lateblight: ['late-blight'],
  bacterialspot: ['bacterial-spot'],
  yellowleafcurlvirus: ['leaf-curl-virus', 'yellow-leaf-curl'],
};

export async function getDiseases(): Promise<Disease[]> {
  const records = await fetchJson<DiseaseDto[]>('/api/diseases');
  return ALL_DISEASES.map((disease) => {
    const record = records.find((candidate) => {
      const hints = diseaseIdHints[normalize(candidate.name)] ?? [];
      return candidate.isActive && (
        hints.some((hint) => disease.id.includes(hint))
        || normalize(disease.name).includes(normalize(candidate.vietnameseName ?? candidate.name))
      );
    });
    if (!record) return disease;

    return {
      ...disease,
      backendId: record.id,
      name: record.vietnameseName ?? disease.name,
      overview: record.description ?? disease.overview,
      symptoms: splitContent(record.symptoms, disease.symptoms),
      prevention: splitContent(record.prevention, disease.prevention),
      management: splitContent(record.treatment, disease.management),
    };
  });
}

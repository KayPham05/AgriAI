import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDiseases, getPlants, type DiseaseDto, type PlantDto } from '@/services/catalogApi';

afterEach(() => vi.unstubAllGlobals());

describe('backend leaf reference metadata', () => {
  it('keeps the four non-model crop references accessible without activating backend rows', async () => {
    const record: PlantDto = {
      id: 'archived-potato',
      name: 'Potato',
      vietnameseName: 'Khoai tây',
      scientificName: null,
      description: null,
      isActive: false,
      createdAt: '2026-10-12T00:00:00Z',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([record]))));
    const plants = await getPlants();
    expect(plants.map((plant) => plant.id)).toEqual(['pomelo', 'potato', 'banana', 'watermelon']);
    const potato = plants.find((plant) => plant.id === 'potato');
    expect(potato?.backendId).toBeUndefined();
    expect(potato?.detectableCount).toBe(0);
    expect(potato?.description).toContain('Cây tham khảo');
    expect(potato?.conditions.find((item) => item.isHealthy)?.imageUrl).toBeTruthy();
  });
  it('matches canonical Esca without replacing the grape photo or hiding its unverified status', async () => {
    const record: DiseaseDto = {
      id: 'esca-backend',
      name: 'Esca',
      vietnameseName: 'Esca',
      description: 'Backend description',
      symptoms: null,
      treatment: null,
      prevention: null,
      isActive: true,
      createdAt: '2026-10-12T00:00:00Z',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([record]))));
    const disease = (await getDiseases()).find((item) => item.id === 'grape-esca');
    expect(disease?.backendId).toBe('esca-backend');
    expect(decodeURI(disease?.heroImage ?? '')).toContain('/Bệnh lá/Nho/Esca.jpg');
    expect(disease?.overview).toContain('chưa được xác minh chuyên môn');
    expect(disease?.overview).toContain('Backend description');
  });

  it('does not match leaf references to an unrelated backend condition', async () => {
    const record: DiseaseDto = {
      id: 'unknown-backend',
      name: 'Unknown',
      vietnameseName: '',
      description: 'Unrelated description',
      symptoms: null,
      treatment: null,
      prevention: null,
      isActive: true,
      createdAt: '2026-10-12T00:00:00Z',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([record]))));
    const disease = (await getDiseases()).find((item) => item.id === 'grape-esca');
    expect(disease?.backendId).toBeUndefined();
    expect(disease?.overview).not.toContain('Unrelated description');
  });
});

describe('backend plant photograph matching', () => {
  it.each([
    ['Ca_chua', 'Cà chua', 'tomato', 'cà chua banner.jpg'],
    ['Ca_phe', 'Cà phê', 'coffee', 'cà phề banner.jpg'],
    ['Cam', 'Cam', 'orange', 'cam banner.jpg'],
    ['Che', 'Chè', 'tea', 'chè banner.jpg'],
    ['Lua', 'Lúa', 'rice', 'lúa banner.jpg'],
    ['Ngo', 'Ngô', 'corn', 'ngô banner.jpg'],
    ['Ot', 'Ớt', 'chili', 'ớt banner.jpg'],
    ['Sau_rieng', 'Sầu riêng', 'durian', 'sầu riêng banner.jpg'],
    ['Xoai', 'Xoài', 'mango', 'xoài banner.jpg'],
    ['Pepper', null, 'chili', 'ớt banner.jpg'],
    ['Chuoi', 'Chuối', 'banana', 'chuối banner.jpg'],
    ['Khoai_tay', 'Khoai tây', 'potato', 'khoai banner.jpg'],
    ['Dua_hau', 'Dưa hấu', 'watermelon', 'dưa hấu.jpg'],
    ['Buoi', 'Bưởi', 'pomelo', 'bưởi banner.jpg'],
    ['Nho', 'Nho', 'grape', 'nho banner.jpg'],
  ])('matches %s to its own real banner photograph', async (name, vietnameseName, id, filename) => {
    const record: PlantDto = {
      id: 'backend-plant-id',
      name,
      vietnameseName,
      scientificName: null,
      description: null,
      isActive: true,
      createdAt: '2026-10-12T00:00:00Z',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([record]))));
    const [plant] = await getPlants();
    expect(plant.id).toBe(id);
    expect(decodeURI(plant.imageUrl)).toContain(`/assets/banner/${filename}`);
    expect(plant.backendId).toBe(record.id);
    if (vietnameseName) expect(plant.name).toBe(vietnameseName);
    expect(plant.category).not.toBe('Khác');
  });
});

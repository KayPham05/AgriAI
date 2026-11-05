import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDiseases, getPlants, type DiseaseDto, type PlantDto } from '@/services/catalogApi';

afterEach(() => vi.unstubAllGlobals());

describe('backend leaf reference metadata', () => {
  it('does not reintroduce inactive plants through local reference templates', async () => {
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
    expect(plants).toEqual([]);
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
    ['Lua', 'Lúa'],
    ['Mang_cau_fixture', 'Mãng cầu mới'],
  ])(
    'uses the uploaded photo for %s, including plants without a local template',
    async (name, vietnameseName) => {
      const imageUrl = '/api/catalog/plants/backend-plant-id/image?v=uploaded.png';
      const record: PlantDto = {
        id: 'backend-plant-id',
        name,
        vietnameseName,
        imageUrl,
        scientificName: null,
        description: null,
        isActive: true,
        createdAt: '',
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([record]))));

      const [plant] = await getPlants();

      expect(plant.imageUrl).toBe(imageUrl);
      expect(plant.backendId).toBe(record.id);
      expect(plant.name).toBe(vietnameseName);
    },
  );

  it.each([null, undefined])(
    'uses the default logo for an unknown plant with no uploaded image (%s)',
    async (imageUrl) => {
      const record: PlantDto = {
        id: 'unknown-plant',
        name: 'UnlistedPlantFixture',
        vietnameseName: 'Cây mới',
        imageUrl,
        scientificName: null,
        description: null,
        isActive: true,
        createdAt: '',
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([record]))));
      expect((await getPlants())[0].imageUrl).toBe('/images/agriai-leaf-mark.png');
    },
  );

  it('uses the uploaded disease photo while preserving the reference identity and content', async () => {
    const imageUrl = '/api/catalog/diseases/esca-backend/image?v=uploaded.jpg';
    const record: DiseaseDto = {
      id: 'esca-backend',
      name: 'Esca',
      vietnameseName: 'Esca',
      imageUrl,
      description: 'Backend description',
      symptoms: null,
      treatment: null,
      prevention: null,
      isActive: true,
      createdAt: '',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([record]))));

    const disease = (await getDiseases()).find((item) => item.id === 'grape-esca');

    expect(disease?.heroImage).toBe(imageUrl);
    expect(disease?.backendId).toBe(record.id);
    expect(disease?.overview).toContain('Backend description');
  });

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

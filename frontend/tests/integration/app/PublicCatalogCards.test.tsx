import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PublicCatalog } from '@/features/knowledge/PublicCatalog';
import { SUPPORTED_PLANTS } from '@/data/plantData';
import { LEAF_PHOTOS } from '@/data/leafPhotos';
import type { CatalogKind, CatalogRecord, PlantDiseasePair } from '@/services/knowledgeApi';
import { medicine, pair, page, json } from '../../helpers/knowledge';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function show(kind: CatalogKind, record: CatalogRecord, pairs: PlantDiseasePair[] = [pair]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('plant-diseases')) return json(page(pairs));
      return json(kind === 'medicines' ? page([record]) : [record]);
    }),
  );
  render(<PublicCatalog kind={kind} />);
}

function showDetail(
  kind: CatalogKind,
  id: string,
  record: CatalogRecord,
  pairs: PlantDiseasePair[] = [pair],
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('plant-diseases')) return json(page(pairs));
      return json(record);
    }),
  );
  render(<PublicCatalog kind={kind} id={id} />);
}

describe('public catalog card content', () => {
  it.each(['plants', 'diseases'] as const)(
    'prefers the uploaded photo in the new %s card layout',
    async (kind) => {
      const imageUrl = `/api/catalog/${kind}/uploaded-record/image?v=admin.png`;
      show(kind, {
        id: 'uploaded-record',
        name: kind === 'plants' ? 'Lua' : 'Chay_la',
        vietnameseName: 'Ảnh danh mục',
        imageUrl,
        category: 'Cây ăn trái',
        isActive: true,
        createdAt: '',
      });

      expect(await screen.findByRole('img', { name: 'Ảnh danh mục' })).toHaveAttribute(
        'src',
        imageUrl,
      );
      expect(screen.getByRole('link', { name: 'Xem chi tiết' })).toHaveAttribute(
        'href',
        `/${kind}/uploaded-record`,
      );
      if (kind === 'plants') expect(screen.getByText('Cây ăn trái')).toBeVisible();
    },
  );

  it('keeps an uploaded photo and saved category in the expanded plant detail', async () => {
    const imageUrl = '/api/catalog/plants/rice/image?v=admin.jpg';
    showDetail('plants', 'rice', {
      id: 'rice',
      name: 'Lua',
      vietnameseName: 'Lúa',
      imageUrl,
      category: 'Khác',
      isActive: true,
      createdAt: '',
    });

    expect(await screen.findByRole('img', { name: 'Lúa' })).toHaveAttribute(
      'src',
      imageUrl,
    );
    expect(screen.getByText('Khác')).toBeVisible();
  });

  it('allows a catalog-only disease link without an AI class name', async () => {
    show('diseases', { id: pair.diseaseId, name: 'Bệnh mới', isActive: true, createdAt: '' }, [
      { ...pair, className: null, classIndex: null },
    ]);

    expect(await screen.findByRole('heading', { name: 'Bệnh mới' })).toBeVisible();
    expect(screen.getByText('Chưa có ảnh đối chiếu')).toBeVisible();
  });

  it('presents a plant detail with clear crop information and related actions', async () => {
    showDetail(
      'plants',
      '00000000-0000-0000-0000-000000000001',
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Ca_chua',
        vietnameseName: 'Cà chua',
        scientificName: 'Solanum lycopersicum',
        description: 'Cây hoa màu ngắn ngày.',
        isActive: true,
        createdAt: '',
      },
      [{ ...pair, plantId: '00000000-0000-0000-0000-000000000001' }],
    );

    expect(await screen.findByRole('heading', { name: 'Cà chua', level: 1 })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Cà chua' })).toBeVisible();
    expect(screen.getByText('Cây lương thực')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Dấu hiệu trên lá tham khảo' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Kiểm tra lá' })).toHaveAttribute('href', '/diagnose');
    expect(screen.getByRole('link', { name: 'Trích xuất liên quan' })).toHaveAttribute(
      'href',
      `/knowledge?plantId=00000000-0000-0000-0000-000000000001&diseaseId=${pair.diseaseId}`,
    );
  });

  it('uses the matching home crop photograph and preserves the API detail identity', async () => {
    show('plants', {
      id: 'backend-rice',
      name: 'Lua',
      scientificName: 'Oryza sativa',
      isActive: true,
      createdAt: '',
    });
    const image = await screen.findByRole('img', { name: 'Lúa nước' });
    const source = SUPPORTED_PLANTS.find((plant) => plant.id === 'rice')?.imageUrl;
    expect(source).toBeTruthy();
    expect(decodeURIComponent(image.getAttribute('src') ?? '')).toContain(source);
    expect(screen.getByText('Oryza sativa')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Xem chi tiết' })).toHaveAttribute(
      'href',
      '/plants/backend-rice',
    );
  });

  it('uses a leaf illustration only for the matching crop-condition pair', async () => {
    show('diseases', { id: pair.diseaseId, name: 'Chay_la', isActive: true, createdAt: '' }, [
      { ...pair, plantName: 'Lúa', className: 'Lua___Chay_la' },
    ]);
    const image = await screen.findByRole('img', { name: 'Chay_la trên lá Lúa' });
    const source = LEAF_PHOTOS.find((photo) => photo.id === 'rice-leaf-scorch')?.imageUrl;
    expect(source).toBeTruthy();
    expect(decodeURIComponent(image.getAttribute('src') ?? '')).toContain(source);
    expect(screen.getByText(/chưa được xác minh chuyên môn/)).toBeVisible();
  });

  it('does not borrow a similarly named leaf from a different crop', async () => {
    show('diseases', { id: pair.diseaseId, name: 'Chay_la', isActive: true, createdAt: '' }, [
      { ...pair, plantName: 'Cây mới', className: 'Unknown___Chay_la' },
    ]);
    expect(await screen.findByText('Chưa có ảnh đối chiếu')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps an unknown crop accessible without assigning another crop photo', async () => {
    show('plants', { id: 'new-crop', name: 'Cây mới', isActive: true, createdAt: '' });
    expect(await screen.findByText('Chưa có ảnh cây trồng')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem chi tiết' })).toHaveAttribute(
      'href',
      '/plants/new-crop',
    );
  });

  it('replaces a broken photograph without losing the detail link', async () => {
    show('plants', { id: 'tomato', name: 'Ca_chua', isActive: true, createdAt: '' });
    fireEvent.error(await screen.findByRole('img', { name: 'Cà chua' }));
    expect(screen.getByText('Chưa có ảnh cây trồng')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem chi tiết' })).toHaveAttribute(
      'href',
      '/plants/tomato',
    );
  });

  it('shows medicine identity and active ingredient with an honest missing product image', async () => {
    show('medicines', medicine);
    expect(await screen.findByText('Chưa có ảnh sản phẩm')).toBeVisible();
    expect(screen.getByRole('heading', { name: medicine.productName })).toBeVisible();
    expect(screen.getByText('Hoạt chất kiểm thử')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem chi tiết' })).toHaveAttribute(
      'href',
      '/medicines/medicine-a',
    );
  });
});

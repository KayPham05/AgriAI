import { describe, expect, it, vi } from 'vitest';
import { catalogRequest, loadAllPairs, readCatalogPage } from '@/services/knowledgeApi';

describe('knowledge API transport', () => {
  it('sends bearer authorization only for an explicit admin session and handles 204', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    await expect(
      catalogRequest('/api/admin/medicines/item', { token: 'admin', method: 'DELETE' }),
    ).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer admin');
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
    await catalogRequest('/api/medicines');
    expect(fetch.mock.calls[1][1].headers.Authorization).toBeUndefined();
    expect(fetch.mock.calls[1][1].cache).toBe('no-store');
  });

  it.each([401, 403, 404, 500])(
    'preserves HTTP %i even when there is no JSON body',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })));
      await expect(catalogRequest('/api/admin/medicines')).rejects.toMatchObject({ status });
    },
  );

  it('exposes model-validation errors without dropping the status', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ errors: { Title: ['Required'] } }), { status: 400 }),
        ),
    );
    await expect(catalogRequest('/api/knowledge-documents')).rejects.toMatchObject({
      status: 400,
      message: 'Title: Required',
    });
  });

  it('passes server filters and pagination without filtering a partial page', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ items: [], totalCount: 41, pageNumber: 2, pageSize: 20, totalPages: 3 }),
        ),
      );
    vi.stubGlobal('fetch', fetch);
    const page = await readCatalogPage('medicines', {
      search: 'lá & cây',
      plantId: 'plant-id',
      diseaseId: 'disease-id',
      pageNumber: 2,
    });
    const url = new URL(fetch.mock.calls[0][0], 'http://localhost');
    expect(url.pathname).toBe('/api/medicines');
    expect(url.searchParams.get('search')).toBe('lá & cây');
    expect(url.searchParams.get('plantId')).toBe('plant-id');
    expect(url.searchParams.get('diseaseId')).toBe('disease-id');
    expect(url.searchParams.get('pageNumber')).toBe('2');
    expect(page.totalCount).toBe(41);
  });

  it('loads every pair page, including inactive pairs for an admin editor', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ items: [{ id: 'first', isActive: false }], hasNextPage: true }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ items: [{ id: 'last', isActive: true }], hasNextPage: false }),
        ),
      );
    vi.stubGlobal('fetch', fetch);
    const pairs = await loadAllPairs('admin');
    expect(pairs.map((pair) => pair.id)).toEqual(['first', 'last']);
    expect(fetch.mock.calls[1][0]).toContain('/api/admin/plant-diseases?pageNumber=2');
  });
});

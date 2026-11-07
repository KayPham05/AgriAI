import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('catalog image source', () => {
  it.each([
    undefined,
    null,
    '',
    '/images/fallback.png',
    'https://external.test/photo.jpg',
    '//external.test/photo.jpg',
  ])('does not treat %s as a backend catalog image', async (path) => {
    const { catalogImageSource } = await import('@/lib/catalogImages');
    expect(catalogImageSource(path)).toBeUndefined();
  });

  it.each(['', 'https://api.example.test', 'https://api.example.test/'])(
    'resolves versioned catalog paths with API base %s',
    async (base) => {
      vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', base);
      vi.resetModules();
      const { catalogImageSource } = await import('@/lib/catalogImages');
      const path = '/api/catalog/plants/plant-id/image?v=photo.png';
      expect(catalogImageSource(path)).toBe(`${base.replace(/\/$/, '')}${path}`);
    },
  );
});

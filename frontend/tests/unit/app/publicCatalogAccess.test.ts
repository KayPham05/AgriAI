import { describe, expect, it } from 'vitest';
import { isPublicCatalogPath, safeSource } from '@/features/knowledge/catalogUi';
describe('public catalog route boundary', () => {
  it.each([
    '/plants',
    '/plants/tomato',
    '/diseases/id',
    '/medicines/id',
    '/knowledge',
    '/knowledge/id',
  ])('allows public reading at %s', (path) => expect(isPublicCatalogPath(path)).toBe(true));
  it.each(['/admin', '/history', '/profile', '/diagnose', '/knowledge-private', '/plants/id/edit'])(
    'does not grant public access to %s',
    (path) => expect(isPublicCatalogPath(path)).toBe(false),
  );
  it.each([
    'javascript:alert(1)',
    'data:text/html,unsafe',
    'https://user:password@example.test',
    '/relative',
  ])('does not render unsafe source %s', (url) => expect(safeSource(url)).toBeNull());
});

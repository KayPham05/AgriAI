import { expect, it } from 'vitest';
import { normalizeCatalogText, rankCatalog } from '@/lib/catalogText';

it('normalizes spacing while preserving scientific names, codes, doses and paragraphs', () => {
  expect(normalizeCatalogText('  Solanum  lycopersicum  ')).toBe('Solanum lycopersicum');
  expect(normalizeCatalogText(' Ca_chua___Benh ')).toBe('Ca_chua___Benh');
  expect(normalizeCatalogText('  Pha  2,5 g/L.\r\n\r\n  Phun sau 7–10 ngày.  ')).toBe(
    'Pha 2,5 g/L.\n\nPhun sau 7–10 ngày.',
  );
});

it('ranks exact matches before Vietnamese accent-insensitive and minor typo matches', () => {
  const records = ['Cà chua', 'Ca chua bi', 'Lúa', 'Ca chuaa'];
  expect(rankCatalog(records, 'ca chua', (text) => text)).toEqual([
    'Cà chua',
    'Ca chua bi',
    'Ca chuaa',
  ]);
  expect(rankCatalog(records, 'ca chya', (text) => text)).toContain('Cà chua');
  expect(rankCatalog(records, 'xyz', (text) => text)).toEqual([]);
});

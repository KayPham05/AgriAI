import type { Metadata } from 'next';
import { describe, expect, it } from 'vitest';
import * as plantPage from './(website)/(application)/plants/[id]/page';
import * as diseasePage from './(website)/(application)/diseases/[id]/page';

type DetailPageModule = {
  metadata?: Metadata;
  generateMetadata?: (props: { params: Promise<{ id: string }> }) => Promise<Metadata>;
};
async function readMetadata(page: DetailPageModule, id: string) {
  return page.generateMetadata
    ? page.generateMetadata({ params: Promise.resolve({ id }) })
    : page.metadata;
}
describe('detail route metadata', () => {
  it('identifies a known crop rather than giving every plant the same title', async () => {
    expect((await readMetadata(plantPage, 'coffee'))?.title).toBe('Cà phê | AgriAI');
  });
  it('identifies the disease being viewed', async () => {
    expect((await readMetadata(diseasePage, 'coffee-leaf-rust'))?.title).toBe(
      'Bệnh rỉ sắt cà phê | AgriAI',
    );
  });
  it('does not reflect an unknown backend ID into the page title', async () => {
    expect((await readMetadata(plantPage, 'unknown-id'))?.title).toBe(
      'Chi tiết cây trồng | AgriAI',
    );
  });
});

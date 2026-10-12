// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOTANICAL_BANNERS } from './bannerData';
import { SUPPORTED_PLANTS } from './plantData';

describe('user-provided crop photographs', () => {
  it('preserves the original crop order and appends the supplied grape scene', () => {
    expect(BOTANICAL_BANNERS.map((banner) => banner.id)).toEqual([
      'rice',
      'tomato',
      'corn',
      'potato',
      'chili',
      'coffee',
      'tea',
      'banana',
      'watermelon',
      'orange',
      'mango',
      'durian',
      'pomelo',
      'grape',
    ]);
  });

  it.each([
    ['rice', 'lúa banner.jpg'],
    ['tomato', 'cà chua banner.jpg'],
    ['corn', 'ngô banner.jpg'],
    ['potato', 'khoai banner.jpg'],
    ['chili', 'ớt banner.jpg'],
    ['coffee', 'cà phề banner.jpg'],
    ['tea', 'chè banner.jpg'],
    ['banana', 'chuối banner.jpg'],
    ['watermelon', 'dưa hấu.jpg'],
    ['orange', 'cam banner.jpg'],
    ['mango', 'xoài banner.jpg'],
    ['durian', 'sầu riêng.jpg'],
    ['pomelo', 'bưởi banner.jpg'],
    ['grape', 'nho banner.jpg'],
  ])('uses the supplied JPEG for %s rather than old artwork', (id, filename) => {
    const banner = BOTANICAL_BANNERS.find((scene) => scene.id === id);
    expect(banner).toBeDefined();
    expect(decodeURI(String(banner?.imageSrc))).toContain(filename);
    const plant = SUPPORTED_PLANTS.find((item) => item.id === id);
    expect(decodeURI(plant?.imageUrl ?? '')).toContain(filename);
    const bytes = readFileSync(new URL(`../assets/banner/${filename}`, import.meta.url));
    expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });

  it('does not present decorative crop images as verified leaf-condition references', () => {
    expect(
      SUPPORTED_PLANTS.flatMap((plant) => plant.conditions).filter(
        (condition) => condition.imageUrl && !decodeURI(condition.imageUrl).includes('/Bệnh lá/'),
      ),
    ).toEqual([]);
  });
});

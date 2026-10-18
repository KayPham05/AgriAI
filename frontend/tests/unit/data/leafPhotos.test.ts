// @vitest-environment node
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL_DISEASES, SUPPORTED_PLANTS } from '@/data/plantData';
import { attachDiseasePhotos } from '@/data/leafPhotos';

describe('supplied leaf photography in the catalog', () => {
  it('does not invent plant details for a leaf photo whose plant is absent', () => {
    expect(attachDiseasePhotos([], [])).toEqual([]);
  });
  it('makes every supplied photograph reachable through its plant conditions', () => {
    const files = readdirSync(new URL('../../../src/assets/Bệnh lá', import.meta.url), {
      recursive: true,
    })
      .filter((file) => /\.(?:jpe?g|png|webp)$/i.test(String(file)))
      .map((file) => String(file).replaceAll('\\', '/'));
    const sources = SUPPORTED_PLANTS.flatMap((plant) =>
      plant.conditions.map((item) => decodeURI(item.imageUrl ?? '')),
    );
    for (const file of files)
      expect(
        sources.some((src) => src.endsWith(`/Bệnh lá/${file}`)),
        file,
      ).toBe(true);
  });

  it.each([
    ['rice', 'rice-blast', 'Lúa/bệnh đạo ôn lúa.png'],
    ['tomato', 'tomato-early-blight', 'cà chua/Cháy lá sớm  đốm vòng.jpg'],
    ['coffee', 'coffee-leaf-rust', 'Cà phê/Gỉ sắt.png'],
    ['grape', 'grape-esca', 'Nho/Esca.jpg'],
    ['potato', 'potato-late-blight', 'Khoai tây/Mốc sương.jpg'],
    ['banana', 'banana-sigatoka', 'Chuối/Đốm lá Sigatoka.jpg'],
    ['pomelo', 'pomelo-canker', 'Bưởi/Bưởi — loét vi khuẩn.jpg'],
    ['watermelon', 'watermelon-downy-mildew', 'Dưa hấu/Sương mai.jpg'],
  ])('shares the correct %s photo between plant and disease details', (plantId, id, filename) => {
    const condition = SUPPORTED_PLANTS.find((plant) => plant.id === plantId)?.conditions.find(
      (item) => item.id === id,
    );
    const disease = ALL_DISEASES.find((item) => item.id === id);
    expect(decodeURI(condition?.imageUrl ?? '')).toContain(`/Bệnh lá/${filename}`);
    expect(disease?.heroImage).toBe(condition?.imageUrl);
    expect(disease?.plantId).toBe(plantId);
    expect(ALL_DISEASES.filter((item) => item.id === id)).toHaveLength(1);
  });

  it('does not use ambiguous rice yellowing photography to certify Tungro', () => {
    const rice = SUPPORTED_PLANTS.find((plant) => plant.id === 'rice');
    expect(rice?.conditions.find((item) => item.id === 'rice-tungro')?.imageUrl).toBeUndefined();
  });

  it('keeps healthy photographs out of the disease catalog', () => {
    expect(ALL_DISEASES.some((item) => decodeURI(item.heroImage).includes('khỏe mạnh'))).toBe(
      false,
    );
    expect(
      SUPPORTED_PLANTS.find((plant) => plant.id === 'grape')?.conditions.find(
        (item) => item.isHealthy,
      )?.imageUrl,
    ).toBeTruthy();
  });
});

import type { StaticImageData } from 'next/image';
import rice from '@/assets/banner-leaves/rice-leaf-cutout.png';
import riceStalk from '@/assets/banner-leaves/rice-stalk-cutout.png';
import tomato from '@/assets/banner-leaves/tomato-foliage-cutout.png';
import corn from '@/assets/banner-leaves/corn-foliage-cutout.png';
import potato from '@/assets/banner-leaves/potato-foliage-cutout.png';
import chili from '@/assets/banner-leaves/chili-foliage-cutout.png';
import coffee from '@/assets/banner-leaves/coffee-foliage-cutout.png';
import tea from '@/assets/banner-leaves/tea-foliage-cutout.png';
import banana from '@/assets/banner-leaves/banana-foliage-cutout.png';
import watermelon from '@/assets/banner-leaves/watermelon-foliage-cutout.png';
import orange from '@/assets/banner-leaves/orange-foliage-cutout.png';
import mango from '@/assets/banner-leaves/mango-foliage-cutout.png';
import durian from '@/assets/banner-leaves/durian-foliage-cutout.png';
import pomelo from '@/assets/banner-leaves/pomelo-foliage-cutout.png';
import grape from '@/assets/banner-leaves/grape-foliage-cutout.png';

// Legacy generated artwork is decorative only, never crop or disease-reference photography.
export const RICE_LEAF = rice;

export const BANNER_FOLIAGE: Record<string, StaticImageData> = {
  rice: riceStalk,
  tomato,
  corn,
  potato,
  chili,
  coffee,
  tea,
  banana,
  watermelon,
  orange,
  mango,
  durian,
  pomelo,
  grape,
};

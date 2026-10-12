import ricePhoto from '@/assets/banner/lúa banner.jpg';
import tomatoPhoto from '@/assets/banner/cà chua banner.jpg';
import cornPhoto from '@/assets/banner/ngô banner.jpg';
import potatoPhoto from '@/assets/banner/khoai banner.jpg';
import chiliPhoto from '@/assets/banner/ớt banner.jpg';
import coffeePhoto from '@/assets/banner/cà phề banner.jpg';
import teaPhoto from '@/assets/banner/chè banner.jpg';
import bananaPhoto from '@/assets/banner/chuối banner.jpg';
import watermelonPhoto from '@/assets/banner/dưa hấu.jpg';
import orangePhoto from '@/assets/banner/cam banner.jpg';
import mangoPhoto from '@/assets/banner/xoài banner.jpg';
import durianPhoto from '@/assets/banner/sầu riêng.jpg';
import pomeloPhoto from '@/assets/banner/bưởi banner.jpg';
import grapePhoto from '@/assets/banner/nho banner.jpg';
import type { StaticImageData } from 'next/image';

// Explicit imports let Next generate optimized sizes without altering the originals.
export const CROP_PHOTOS: Record<
  string,
  { imageSrc: StaticImageData; imageAlt: string; photoPosition: string }
> = {
  rice: {
    imageSrc: ricePhoto,
    imageAlt: 'Bàn tay chạm vào bông lúa trên cánh đồng',
    photoPosition: '60% 60%',
  },
  tomato: {
    imageSrc: tomatoPhoto,
    imageAlt: 'Bàn tay cầm quả cà chua chín trên cây',
    photoPosition: '70% 45%',
  },
  corn: {
    imageSrc: cornPhoto,
    imageAlt: 'Người trồng cây dùng máy tính bảng giữa ruộng ngô',
    photoPosition: '70% 50%',
  },
  potato: {
    imageSrc: potatoPhoto,
    imageAlt: 'Những luống khoai tây xanh trên đồng đất',
    photoPosition: '55% 60%',
  },
  chili: {
    imageSrc: chiliPhoto,
    imageAlt: 'Quả ớt đỏ giữa những lá ớt xanh',
    photoPosition: '40% 55%',
  },
  coffee: {
    imageSrc: coffeePhoto,
    imageAlt: 'Chùm quả cà phê đỏ và xanh trên cành',
    photoPosition: '55% 50%',
  },
  tea: {
    imageSrc: teaPhoto,
    imageAlt: 'Người hái chè giữa những luống chè trên đồi',
    photoPosition: '70% 65%',
  },
  banana: {
    imageSrc: bananaPhoto,
    imageAlt: 'Những hàng cây chuối và tán lá xanh trong vườn',
    photoPosition: '50% 55%',
  },
  watermelon: {
    imageSrc: watermelonPhoto,
    imageAlt: 'Quả dưa hấu trên mặt đất giữa những dây lá',
    photoPosition: '60% 55%',
  },
  orange: {
    imageSrc: orangePhoto,
    imageAlt: 'Những quả cam chín trên cây trong vườn',
    photoPosition: '80% 55%',
  },
  mango: {
    imageSrc: mangoPhoto,
    imageAlt: 'Quả xoài trên cành giữa những lá xanh',
    photoPosition: '50% 50%',
  },
  durian: {
    imageSrc: durianPhoto,
    imageAlt: 'Những quả sầu riêng mọc trên cành cây',
    photoPosition: '65% 60%',
  },
  pomelo: {
    imageSrc: pomeloPhoto,
    imageAlt: 'Những quả bưởi vàng trên cây trong vườn',
    photoPosition: '65% 50%',
  },
  grape: {
    imageSrc: grapePhoto,
    imageAlt: 'Thu hoạch chùm nho tím trên giàn nho',
    photoPosition: '65% 45%',
  },
};

export function getCropPhotoUrl(id: string): string {
  const image = CROP_PHOTOS[id].imageSrc;
  // Vite asset imports are URLs; Next static imports include image metadata.
  return typeof image === 'string' ? image : image.src;
}

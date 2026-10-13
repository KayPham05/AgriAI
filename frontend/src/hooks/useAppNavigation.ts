'use client';
import { useRouter } from 'next/navigation';
import { getTabPath, getDetailPath } from '@/lib/appRoutes';
import type { NavigationTab, Plant, Disease } from '@/types';

export function useAppNavigation() {
  const router = useRouter();
  return {
    navigate: (tab: NavigationTab) => router.push(getTabPath(tab)),
    selectPlant: (plant: Plant) => router.push(getDetailPath('plants', plant.id)),
    selectDisease: (disease: Disease) => router.push(getDetailPath('diseases', disease.id)),
    diagnose: () => router.push('/diagnose'),
  };
}

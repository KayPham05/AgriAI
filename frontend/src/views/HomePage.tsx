'use client';

import { HomeLandingHero } from '@/components/home/HomeLandingHero';
import { HomePlantGuide } from '@/components/home/HomePlantGuide';
import type { NavigationTab, Plant } from '@/types';

interface HomeViewProps {
  plants: Plant[];
  onNavigate: (tab: NavigationTab) => void;
  onSelectPlant: (plant: Plant) => void;
}

export function HomePage({ plants, onNavigate, onSelectPlant }: HomeViewProps) {
  return (
    <div>
      <HomeLandingHero onNavigate={onNavigate} />
      <HomePlantGuide plants={plants} onNavigate={onNavigate} onSelectPlant={onSelectPlant} />
    </div>
  );
}

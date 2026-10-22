'use client';

import { HomeLandingHero } from '@/components/home/HomeLandingHero';
import { HomePlantGuide } from '@/components/home/HomePlantGuide';
import type { NavigationTab, Plant } from '@/types';

interface HomeViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectPlant: (plant: Plant) => void;
}

export function HomePage({ onNavigate, onSelectPlant }: HomeViewProps) {
  return (
    <div>
      <HomeLandingHero onNavigate={onNavigate} />
      <HomePlantGuide onNavigate={onNavigate} onSelectPlant={onSelectPlant} />
    </div>
  );
}

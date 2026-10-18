'use client';
import { HomePage } from '@/views/HomePage';
import { useAppNavigation } from '@/hooks/useAppNavigation';
export function HomeRoute() {
  const { navigate, selectPlant } = useAppNavigation();
  return <HomePage onNavigate={navigate} onSelectPlant={selectPlant} />;
}

'use client';
import { PlantsPage } from '@/views/PlantsPage';
import { useCatalog } from '@/providers/AppContexts';
import { useAppNavigation } from '@/hooks/useAppNavigation';
export function PlantsRoute() {
  const { plants } = useCatalog();
  const { selectPlant, diagnose } = useAppNavigation();
  return <PlantsPage plants={plants} onSelectPlant={selectPlant} onDiagnosePlant={diagnose} />;
}

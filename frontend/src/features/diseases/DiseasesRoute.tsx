'use client';
import { DiseasesPage } from '@/views/DiseasesPage';
import { useCatalog } from '@/providers/AppContexts';
import { useAppNavigation } from '@/hooks/useAppNavigation';
export function DiseasesRoute() {
  const { diseases } = useCatalog();
  const { selectDisease, diagnose } = useAppNavigation();
  return (
    <DiseasesPage
      diseases={diseases}
      onSelectDisease={selectDisease}
      onDiagnoseDiseasePlant={diagnose}
    />
  );
}

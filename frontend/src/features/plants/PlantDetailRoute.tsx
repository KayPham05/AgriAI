'use client';
import { PlantDetailPage } from '@/views/PlantDetailPage';
import { useCatalog } from '@/providers/AppContexts';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { MissingCatalogItem } from '@/components/common/MissingCatalogItem';
export function PlantDetailRoute({ id }: { id: string }) {
  const { plants, diseases } = useCatalog();
  const { navigate, selectDisease, diagnose } = useAppNavigation();
  const plant = plants.find((item) => item.id === id || item.backendId === id);
  if (!plant) return <MissingCatalogItem kind="plants" />;
  return (
    <PlantDetailPage
      plant={plant}
      onBack={() => navigate('plants')}
      onSelectDisease={(diseaseId) => {
        const disease = diseases.find(
          (item) => item.id === diseaseId || item.backendId === diseaseId,
        );
        if (disease) selectDisease(disease);
      }}
      onDiagnosePlant={diagnose}
    />
  );
}

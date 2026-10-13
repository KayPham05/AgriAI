'use client';
import { DiseaseDetailPage } from '@/views/DiseaseDetailPage';
import { useCatalog } from '@/providers/AppContexts';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { MissingCatalogItem } from '@/components/common/MissingCatalogItem';
export function DiseaseDetailRoute({ id }: { id: string }) {
  const { diseases } = useCatalog();
  const { navigate, diagnose } = useAppNavigation();
  const disease = diseases.find((item) => item.id === id || item.backendId === id);
  if (!disease) return <MissingCatalogItem kind="diseases" />;
  return (
    <DiseaseDetailPage
      disease={disease}
      onBack={() => navigate('diseases')}
      onDiagnosePlant={diagnose}
    />
  );
}

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppProvider } from '@/providers/AppProvider';
import { useAuth } from '@/providers/AppContexts';
import { AppShell } from '@/components/layout/AppShell';
import { getAppRoute } from '@/lib/appRoutes';
import { IntroductionRoute } from '@/features/introduction/IntroductionRoute';
import { HomeRoute } from '@/features/home/HomeRoute';
import { DiagnoseRoute } from '@/features/diagnosis/DiagnoseRoute';
import { PlantsRoute } from '@/features/plants/PlantsRoute';
import { PlantDetailRoute } from '@/features/plants/PlantDetailRoute';
import { DiseasesRoute } from '@/features/diseases/DiseasesRoute';
import { DiseaseDetailRoute } from '@/features/diseases/DiseaseDetailRoute';
import { HistoryRoute } from '@/features/history/HistoryRoute';
import { AboutRoute } from '@/features/about/AboutRoute';
import { ProfileRoute } from '@/features/profile/ProfileRoute';
import { PublicCatalog } from '@/features/knowledge/PublicCatalog';

// jsdom has no Next server. Compose real provider/shell/features; URL history
// comes from each test's Next navigation adapter.
function TestRoute({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const { session } = useAuth();
  const { tab, detailId } = getAppRoute(pathname);
  if (!session && pathname === '/') return <IntroductionRoute />;
  const pages = {
    home: <HomeRoute />,
    diagnose: <DiagnoseRoute />,
    plants: detailId ? <PlantDetailRoute id={detailId} /> : <PlantsRoute />,
    diseases: detailId ? <DiseaseDetailRoute id={detailId} /> : <DiseasesRoute />,
    history: <HistoryRoute />,
    about: <AboutRoute />,
    profile: <ProfileRoute />,
    'plant-detail': null,
    'disease-detail': null,
    knowledge: <PublicCatalog kind="knowledge-documents" id={detailId ?? undefined} />,
    medicines: <PublicCatalog kind="medicines" id={detailId ?? undefined} />,
  };
  return <AppShell>{children ?? pages[tab]}</AppShell>;
}
export default function AppHarness({ children }: { children?: ReactNode }) {
  return (
    <AppProvider>
      <TestRoute>{children}</TestRoute>
    </AppProvider>
  );
}

'use client';
import { DiagnosePage } from '@/views/DiagnosePage';
import { useAuth, useHistory, useCatalog } from '@/providers/AppContexts';
export function DiagnoseRoute() {
  const { session } = useAuth();
  const { addPrediction } = useHistory();
  const { plants } = useCatalog();
  return (
    <DiagnosePage
      authToken={session?.token}
      onPredictionCreated={addPrediction}
      supportedPlants={plants.filter((plant) => !!plant.backendId)}
    />
  );
}

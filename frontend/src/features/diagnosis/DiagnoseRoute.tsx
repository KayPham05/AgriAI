'use client';
import { DiagnosePage } from '@/views/DiagnosePage';
import { useAgriculturalProfiles, useAuth, useHistory, useCatalog } from '@/providers/AppContexts';
export function DiagnoseRoute() {
  const { session, profile } = useAuth();
  const { addPrediction } = useHistory();
  const { plants } = useCatalog();
  const { profiles, createProfile } = useAgriculturalProfiles();
  return (
    <DiagnosePage
      authToken={session?.token}
      onPredictionCreated={addPrediction}
      supportedPlants={plants.filter((plant) => !!plant.backendId)}
      agriculturalProfiles={profiles}
      onCreateAgriculturalProfile={createProfile}
      profileOwnerName={profile.name}
    />
  );
}

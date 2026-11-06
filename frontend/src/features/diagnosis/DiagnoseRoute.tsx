'use client';
import { DiagnosePage } from '@/views/DiagnosePage';
import { useAgriculturalProfiles, useAuth, useHistory } from '@/providers/AppContexts';
import { useActivePlants } from '@/hooks/useActivePlants';
export function DiagnoseRoute() {
  const { session, profile, openAuthentication } = useAuth();
  const { addPrediction } = useHistory();
  const { plants } = useActivePlants();
  const { profiles, createProfile, recordPrediction } = useAgriculturalProfiles();
  return (
    <DiagnosePage
      authToken={session?.token}
      onRequestLogin={() => openAuthentication('login')}
      onPredictionCreated={addPrediction}
      supportedPlants={plants.filter((plant) => !!plant.backendId)}
      agriculturalProfiles={profiles}
      onCreateAgriculturalProfile={createProfile}
      profileOwnerName={profile.name}
      onProfileSaved={recordPrediction}
    />
  );
}

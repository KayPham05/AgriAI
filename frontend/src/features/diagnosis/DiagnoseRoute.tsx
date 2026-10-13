'use client';
import { DiagnosePage } from '@/views/DiagnosePage';
import { useAuth, useHistory } from '@/providers/AppContexts';
export function DiagnoseRoute() {
  const { session } = useAuth();
  const { addPrediction } = useHistory();
  return <DiagnosePage authToken={session?.token} onPredictionCreated={addPrediction} />;
}

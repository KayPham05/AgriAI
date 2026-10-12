'use client';
import { HistoryPage } from '@/views/HistoryPage';
import { useHistory } from '@/providers/AppContexts';
import { useAppNavigation } from '@/hooks/useAppNavigation';
export function HistoryRoute() {
  const { history, viewHistoryItem, deleteHistoryItem } = useHistory();
  const { diagnose } = useAppNavigation();
  return (
    <HistoryPage
      history={history}
      onSelectResult={viewHistoryItem}
      onDeleteResult={deleteHistoryItem}
      onNavigateDiagnose={diagnose}
    />
  );
}

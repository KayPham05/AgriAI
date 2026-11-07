import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppProvider } from '@/providers/AppProvider';
import { useHistory, useAgriculturalProfiles } from '@/providers/AppContexts';
import { restoreAuthSession } from '@/services/authApi';
import { getPlants, getDiseases } from '@/services/catalogApi';
import { getAgriculturalProfiles } from '@/services/agriculturalProfileApi';
import { deletePrediction, getPredictionHistory } from '@/services/predictionApi';
import { successfulPrediction } from '../../helpers/prediction';

vi.mock('next/navigation', () => ({
  usePathname: () => '/history',
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock('@/services/authApi', () => ({ restoreAuthSession: vi.fn(), clearAuthSession: vi.fn() }));
vi.mock('@/services/catalogApi', () => ({
  getPlants: vi.fn().mockResolvedValue([]),
  getDiseases: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/services/agriculturalProfileApi', () => ({ getAgriculturalProfiles: vi.fn() }));
vi.mock('@/services/predictionApi', () => ({
  deletePrediction: vi.fn(),
  getPredictionHistory: vi.fn(),
}));
function Probe() {
  const { history, deleteHistoryItem } = useHistory();
  const { profiles, error } = useAgriculturalProfiles();
  return (
    <>
      <p>History {history.length}</p>
      {profiles.map((p) => (
        <p key={p.id}>
          {p.name} {p.predictionCount}
        </p>
      ))}
      {error && <p>{error}</p>}
      <button
        type="button"
        onClick={() => void deleteHistoryItem(successfulPrediction.diagnosis.id)}
      >
        Delete result
      </button>
    </>
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getPlants).mockResolvedValue([]);
  vi.mocked(getDiseases).mockResolvedValue([]);
  vi.mocked(restoreAuthSession).mockResolvedValue({
    token: 'owner',
    user: {
      id: 'owner',
      role: 'User',
      fullName: 'Owner',
      email: 'owner@example.test',
      createdAt: '2026-01-01',
    },
  });
  vi.mocked(getPredictionHistory).mockResolvedValue([successfulPrediction.diagnosis]);
  vi.mocked(deletePrediction).mockResolvedValue(undefined);
  vi.mocked(getAgriculturalProfiles).mockResolvedValue([
    {
      id: 'one',
      userId: 'owner',
      name: 'Garden',
      description: null,
      createdAt: '2026-01-01',
      updatedAt: null,
      predictionCount: 2,
    },
    {
      id: 'two',
      userId: 'owner',
      name: 'Field',
      description: null,
      createdAt: '2026-01-01',
      updatedAt: null,
      predictionCount: 4,
    },
  ]);
});
it('refreshes all profile counts after deleting a saved prediction', async () => {
  render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  );
  await screen.findByText('Garden 2');
  vi.mocked(getAgriculturalProfiles).mockResolvedValue([
    {
      id: 'one',
      userId: 'owner',
      name: 'Garden',
      description: null,
      createdAt: '2026-01-01',
      updatedAt: null,
      predictionCount: 1,
    },
    {
      id: 'two',
      userId: 'owner',
      name: 'Field',
      description: null,
      createdAt: '2026-01-01',
      updatedAt: null,
      predictionCount: 4,
    },
  ]);
  fireEvent.click(screen.getByText('Delete result'));
  await screen.findByText('History 0');
  await screen.findByText('Garden 1');
  expect(screen.getByText('Field 4')).toBeVisible();
  expect(deletePrediction).toHaveBeenCalledWith(successfulPrediction.diagnosis.id, 'owner');
});
it('retains history and profile counts when deletion fails', async () => {
  render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  );
  await screen.findByText('Garden 2');
  vi.mocked(deletePrediction).mockRejectedValue(new Error('Delete failed'));
  fireEvent.click(screen.getByText('Delete result'));
  await screen.findByText('Delete failed');
  expect(screen.getByText('History 1')).toBeVisible();
  expect(screen.getByText('Garden 2')).toBeVisible();
  expect(getAgriculturalProfiles).toHaveBeenCalledTimes(1);
});
it('removes deleted history even if refreshing profile counts fails', async () => {
  render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  );
  await screen.findByText('Garden 2');
  vi.mocked(getAgriculturalProfiles).mockRejectedValue(new Error('Profile refresh failed'));
  fireEvent.click(screen.getByText('Delete result'));
  await waitFor(() => expect(screen.getByText('History 0')).toBeVisible());
  await screen.findByText('Profile refresh failed');
});

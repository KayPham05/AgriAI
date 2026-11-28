import { render, screen } from '@testing-library/react-native';
import { fetch } from 'expo/fetch';
import { getItemAsync } from 'expo-secure-store';

import AgriculturalProfilesRoute from '@/app/profiles/index';
import { StartupSessionProvider } from '@/features/auth/StartupSession';
import { AgriculturalProfilesScreen } from '@/features/profiles/screens/AgriculturalProfilesScreen';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

describe('S17 AgriculturalProfiles (AGRI-174)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('S17-T1 & S17-T2: renders 2 owner profiles with predictionCount and reflects newly added profile', async () => {
    const view = await render(
      <AgriculturalProfilesScreen
        profiles={[
          { id: 'p-1', name: 'Ruộng lúa OM18', description: 'Khu A', predictionCount: 12, createdAt: '', updatedAt: '' },
          { id: 'p-2', name: 'Vườn xoài', description: null, predictionCount: 4, createdAt: '', updatedAt: '' },
        ]}
        onCreate={jest.fn()}
        onSelectProfile={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    expect(screen.getByText('Ruộng lúa OM18')).toBeVisible();
    expect(screen.getByText('Khu A · 12 lượt chẩn đoán')).toBeVisible();
    expect(screen.getByText('Vườn xoài')).toBeVisible();
    expect(screen.getByText('4 lượt chẩn đoán')).toBeVisible();

    await view.rerender(
      <AgriculturalProfilesScreen
        profiles={[
          { id: 'p-1', name: 'Ruộng lúa OM18', description: 'Khu A', predictionCount: 12, createdAt: '', updatedAt: '' },
          { id: 'p-2', name: 'Vườn xoài', description: null, predictionCount: 4, createdAt: '', updatedAt: '' },
          { id: 'p-3', name: 'Vườn cà chua mới', description: null, predictionCount: 0, createdAt: '', updatedAt: '' },
        ]}
        onCreate={jest.fn()}
        onSelectProfile={jest.fn()}
        onBack={jest.fn()}
      />,
    );
    expect(screen.getByText('Vườn cà chua mới')).toBeVisible();
  });

  it('S17-T3: switching user clears prior user cached profiles', async () => {
    const origUrl = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
    const request = jest.mocked(fetch);

    try {
      jest.mocked(getItemAsync).mockResolvedValue('token-A');
      request
        .mockResolvedValueOnce({ status: 200, json: async () => ({ id: 'user-A', fullName: 'User A', role: 'User' }) } as never)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => [{ id: 'p-a', name: 'Hồ sơ của User A', description: null, predictionCount: 3 }],
        } as never);

      const first = await render(
        <StartupSessionProvider>
          <AgriculturalProfilesRoute />
        </StartupSessionProvider>,
      );
      expect(await screen.findByText('Hồ sơ của User A')).toBeVisible();
      await first.unmount();

      jest.mocked(getItemAsync).mockResolvedValue('token-B');
      request
        .mockResolvedValueOnce({ status: 200, json: async () => ({ id: 'user-B', fullName: 'User B', role: 'User' }) } as never)
        .mockResolvedValueOnce({
          status: 200,
          json: async () => [{ id: 'p-b', name: 'Hồ sơ của User B', description: null, predictionCount: 1 }],
        } as never);

      await render(
        <StartupSessionProvider>
          <AgriculturalProfilesRoute />
        </StartupSessionProvider>,
      );
      expect(await screen.findByText('Hồ sơ của User B')).toBeVisible();
      expect(screen.queryByText('Hồ sơ của User A')).toBeNull();
    } finally {
      if (origUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
      else process.env.EXPO_PUBLIC_API_URL = origUrl;
    }
  });
});

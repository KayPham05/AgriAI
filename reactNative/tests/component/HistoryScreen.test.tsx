import { render, screen, userEvent } from '@testing-library/react-native';
import { fetch } from 'expo/fetch';
import { getItemAsync } from 'expo-secure-store';

import HistoryRoute from '@/app/(tabs)/history';
import { StartupSessionProvider } from '@/features/auth/StartupSession';
import { HistoryScreen } from '@/features/history/screens/HistoryScreen';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

describe('S15 History (AGRI-172)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('S15-T1: Guest enters History tab without calling private history API', async () => {
    jest.mocked(getItemAsync).mockResolvedValue(null);
    const request = jest.mocked(fetch);

    await render(
      <StartupSessionProvider>
        <HistoryRoute />
      </StartupSessionProvider>,
    );

    expect(await screen.findByRole('header', { name: 'Xem lịch sử của bạn' })).toBeVisible();
    expect(request).not.toHaveBeenCalled();
  });

  it('S15-T2: changing filter on page 2 requests page 1 and replaces stale items', async () => {
    const origUrl = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
    jest.mocked(getItemAsync).mockResolvedValue('jwt-token');
    const request = jest.mocked(fetch);

    request
      .mockResolvedValueOnce({ status: 200, json: async () => ({ id: 'u-1', fullName: 'Minh Kha', role: 'User' }) } as never)
      .mockResolvedValueOnce({ status: 200, json: async () => ([{ id: 'prof-1', name: 'Ruộng lúa', predictionCount: 1 }]) } as never)
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          items: [{ id: 'p-1', plantVietnameseName: 'Lúa', diseaseVietnameseName: 'Đốm nâu', confidence: 0.8, createdAt: '2026-11-28T00:00:00Z', images: [] }],
          totalCount: 20,
        }),
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          items: [{ id: 'p-2', plantVietnameseName: 'Xoài', diseaseVietnameseName: 'Thán thư', confidence: 0.9, createdAt: '2026-11-27T00:00:00Z', images: [] }],
          totalCount: 20,
        }),
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          items: [{ id: 'p-3', plantVietnameseName: 'Lúa', diseaseVietnameseName: 'Bạc lá', confidence: 0.85, createdAt: '2026-11-26T00:00:00Z', images: [] }],
          totalCount: 1,
        }),
      } as never);

    try {
      const user = userEvent.setup();
      await render(
        <StartupSessionProvider>
          <HistoryRoute />
        </StartupSessionProvider>,
      );

      expect(await screen.findByText('Đốm nâu · Lúa')).toBeVisible();
      await user.press(screen.getByRole('button', { name: 'Tải thêm' }));
      expect(await screen.findByText('Thán thư · Xoài')).toBeVisible();

      await user.press(screen.getByRole('button', { name: 'Bộ lọc' }));
      await user.press(screen.getByRole('checkbox', { name: 'Ruộng lúa' }));
      await user.press(screen.getByRole('button', { name: 'Áp dụng' }));

      expect(await screen.findByText('Bạc lá · Lúa')).toBeVisible();
      expect(screen.queryByText('Thán thư · Xoài')).toBeNull();
      expect(request).toHaveBeenLastCalledWith(
        'https://api.example.test/api/predictions?pageNumber=1&pageSize=10&agriculturalProfileId=prof-1',
        expect.anything(),
      );
    } finally {
      if (origUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
      else process.env.EXPO_PUBLIC_API_URL = origUrl;
    }
  });

  it('S15-T3: expired image row preserves metadata and opens S16 detail', async () => {
    const onSelectPrediction = jest.fn();
    await render(
      <HistoryScreen
        isAuthenticated
        items={[
          {
            id: 'pred-exp',
            plantName: 'Lúa',
            diseaseName: 'Đốm nâu',
            confidence: 0.75,
            createdAt: '2026-11-20T00:00:00Z',
            isImageExpired: true,
          },
        ]}
        onSelectPrediction={onSelectPrediction}
      />,
    );

    const row = screen.getByRole('button', { name: /Đốm nâu · Lúa/ });
    expect(row).toBeVisible();
    expect(screen.getByText(/Ảnh gốc đã hết hạn/)).toBeVisible();
    await userEvent.setup().press(row);
    expect(onSelectPrediction).toHaveBeenCalledWith('pred-exp');
  });
});

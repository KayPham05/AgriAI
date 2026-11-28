import { render, screen, userEvent } from '@testing-library/react-native';
import { fetch } from 'expo/fetch';
import { getItemAsync } from 'expo-secure-store';

import HomeTabRoute from '@/app/(tabs)/home';
import { StartupSessionProvider } from '@/features/auth/StartupSession';
import { fetchRecentPredictions } from '@/features/home/fetchRecentPredictions';
import { HomeScreen } from '@/features/home/screens/HomeScreen';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

describe('S10 Home (AGRI-167)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('S10-T1: Guest opens Home without calling history API and sees login prompt', async () => {
    jest.mocked(getItemAsync).mockResolvedValue(null);
    const request = jest.mocked(fetch);

    await render(
      <StartupSessionProvider>
        <HomeTabRoute />
      </StartupSessionProvider>,
    );

    expect(await screen.findByRole('header', { name: 'Lưu kết quả của bạn' })).toBeVisible();
    expect(screen.getByText('Đăng nhập để xem và lưu các lần chẩn đoán.')).toBeVisible();
    expect(request).not.toHaveBeenCalled();
  });

  it('S10-T2: User sees at most 3 recent items from API with Vietnamese fallback and opens S16 by id', async () => {
    const onSelectPrediction = jest.fn();
    const onDiagnose = jest.fn();
    const user = userEvent.setup();

    await render(
      <HomeScreen
        isAuthenticated
        fullName="Minh Kha"
        onDiagnose={onDiagnose}
        onSelectPrediction={onSelectPrediction}
        history={{
          status: 'loaded',
          items: [
            { id: 'p-1', plantName: 'Lúa', diseaseName: 'Đốm nâu', confidence: 0.75, createdAt: '2026-11-28T08:00:00Z' },
            { id: 'p-2', plantName: 'Xoài', diseaseName: 'Thán thư', confidence: 0.885, createdAt: '2026-11-27T08:00:00Z' },
            { id: 'p-3', plantName: 'Cà chua', diseaseName: 'Leaf Mold', confidence: 0.82, createdAt: '2026-11-25T08:00:00Z' },
            { id: 'p-4', plantName: 'Lúa', diseaseName: 'Bạc lá', confidence: 0.91, createdAt: '2026-11-24T08:00:00Z' },
          ],
        }}
      />,
    );

    expect(screen.getByRole('header', { name: 'Chào Minh Kha' })).toBeVisible();
    expect(screen.getByText('Đốm nâu · Lúa')).toBeVisible();
    expect(screen.getByText('Thán thư · Xoài')).toBeVisible();
    expect(screen.getByText('Leaf Mold · Cà chua')).toBeVisible();
    expect(screen.queryByText('Bạc lá · Lúa')).toBeNull();

    await user.press(screen.getByRole('button', { name: /Đốm nâu · Lúa/ }));
    expect(onSelectPrediction).toHaveBeenCalledWith('p-1');
  });

  it('S10-T3: History error shows retry while keeping capture CTA enabled and clickable', async () => {
    const onDiagnose = jest.fn();
    const onRetryHistory = jest.fn();
    const user = userEvent.setup();

    await render(
      <HomeScreen
        isAuthenticated
        fullName="Minh Kha"
        history={{ status: 'error' }}
        onDiagnose={onDiagnose}
        onRetryHistory={onRetryHistory}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng thử lại. Bạn vẫn có thể chụp ảnh lá ngay lúc này.');
    await user.press(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetryHistory).toHaveBeenCalledTimes(1);

    const captureBtn = screen.getByRole('button', { name: 'Chụp ảnh lá' });
    expect(captureBtn).toBeEnabled();
    await user.press(captureBtn);
    expect(onDiagnose).toHaveBeenCalledTimes(1);
  });

  it('fetchRecentPredictions calls GET /api/predictions?pageNumber=1&pageSize=3 and falls back to original names', async () => {
    const request = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        items: [
          {
            id: 'pred-1',
            plantName: 'Tomato',
            plantVietnameseName: '',
            diseaseName: 'Leaf Mold',
            diseaseVietnameseName: null,
            confidence: 0.82,
            createdAt: '2026-11-28T00:00:00Z',
          },
          {
            id: 'pred-2',
            plantName: 'Rice',
            plantVietnameseName: 'Lúa',
            diseaseName: 'Brown Spot',
            diseaseVietnameseName: 'Đốm nâu',
            confidence: 0.75,
            createdAt: '2026-11-27T00:00:00Z',
          },
        ],
      }),
    });

    const result = await fetchRecentPredictions({
      readToken: async () => 'jwt-token',
      request,
      apiOrigin: 'https://api.example.test',
    });

    expect(request).toHaveBeenCalledWith(
      'https://api.example.test/api/predictions?pageNumber=1&pageSize=3',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-token' }),
      }),
    );
    expect(result).toEqual({
      kind: 'loaded',
      items: [
        { id: 'pred-1', plantName: 'Tomato', diseaseName: 'Leaf Mold', confidence: 0.82, createdAt: '2026-11-28T00:00:00Z' },
        { id: 'pred-2', plantName: 'Lúa', diseaseName: 'Đốm nâu', confidence: 0.75, createdAt: '2026-11-27T00:00:00Z' },
      ],
    });
  });
});

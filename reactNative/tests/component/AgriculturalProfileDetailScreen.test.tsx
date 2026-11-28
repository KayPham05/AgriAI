import { render, screen, userEvent } from '@testing-library/react-native';
import { fetch } from 'expo/fetch';
import { getItemAsync } from 'expo-secure-store';

import AgriculturalProfileDetailRoute from '@/app/profiles/[id]';
import { AgriculturalProfileDetailScreen } from '@/features/profiles/screens/AgriculturalProfileDetailScreen';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'prof-19' }),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

describe('S19 AgriculturalProfileDetail (AGRI-176)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('S19-T1: loads profile detail and filters history by agriculturalProfileId', async () => {
    const origUrl = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
    jest.mocked(getItemAsync).mockResolvedValue('jwt-token');
    const request = jest.mocked(fetch);
    request
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ id: 'prof-19', name: 'Ruộng lúa OM18', description: 'Vụ Đông Xuân', predictionCount: 1 }),
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          items: [{ id: 'pred-1', plantVietnameseName: 'Lúa', diseaseVietnameseName: 'Đốm nâu', confidence: 0.75, createdAt: '2026-11-28T00:00:00Z', images: [] }],
          totalCount: 1,
        }),
      } as never);

    try {
      await render(<AgriculturalProfileDetailRoute />);
      expect(await screen.findByRole('header', { name: 'Ruộng lúa OM18' })).toBeVisible();
      expect(await screen.findByText('Đốm nâu · Lúa')).toBeVisible();
      expect(request).toHaveBeenCalledWith(
        'https://api.example.test/api/predictions?pageNumber=1&pageSize=10&agriculturalProfileId=prof-19',
        expect.anything(),
      );
    } finally {
      if (origUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
      else process.env.EXPO_PUBLIC_API_URL = origUrl;
    }
  });

  it('S19-T2: confirms delete while explaining history is preserved and returns on 204', async () => {
    const onDelete = jest.fn().mockResolvedValue({ kind: 'deleted' });
    const onDeleted = jest.fn();
    const user = userEvent.setup();

    await render(
      <AgriculturalProfileDetailScreen
        profile={{ id: 'prof-19', name: 'Ruộng lúa OM18', description: null, predictionCount: 1, createdAt: '', updatedAt: '' }}
        historyItems={[]}
        onDelete={onDelete}
        onDeleted={onDeleted}
        onBack={jest.fn()}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Xóa hồ sơ' }));
    expect(screen.getByText('Chỉ xóa hồ sơ và gỡ liên kết, giữ nguyên lịch sử chẩn đoán của bạn.')).toBeVisible();
    await user.press(screen.getByRole('button', { name: 'Xác nhận xóa hồ sơ' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it('S19-T3: renders not-found state on 404 without leaking other owner details', async () => {
    await render(
      <AgriculturalProfileDetailScreen
        profile={null}
        historyItems={[]}
        notFound
        onBack={jest.fn()}
      />,
    );

    expect(screen.getByRole('header', { name: 'Không tìm thấy hồ sơ' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Về danh sách hồ sơ' })).toBeVisible();
  });
});

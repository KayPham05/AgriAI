import { render, screen, userEvent } from '@testing-library/react-native';

import { saveGuestPrediction } from '@/features/diagnosis/saveGuestPrediction';
import { DiagnosisResultScreen } from '@/features/diagnosis/screens/DiagnosisResultScreen';
import type { PredictionResult } from '@/features/diagnosis/submitPrediction';

const baseResult: PredictionResult = {
  id: 'pred-1',
  imagePath: '/leaf.jpg',
  confidence: 0.75,
  createdAt: '2026-11-28T00:00:00Z',
  predictedPlantDisease: {
    id: 'pd-1',
    plantId: 'pl-1',
    plantName: 'Rice',
    plantVietnameseName: 'Lúa',
    diseaseId: 'di-1',
    diseaseName: 'Brown Spot',
    diseaseVietnameseName: 'Đốm nâu',
    careInstructions: 'Tỉa lá bệnh và giữ ruộng thông thoáng.',
  },
  predictionDetails: [
    { classIndex: 0, className: 'Brown Spot', confidence: 0.75 },
  ],
  images: [],
  hasHistoricalSnapshot: false,
  warning: 'Độ tin cậy thấp',
  informationPending: false,
  recommendedMedicines: [
    { id: 'm-1', name: 'Thuốc không nên hiện khi <= 80%' },
  ],
  guestToken: 'g'.repeat(64),
  guestExpiresAt: '2099-12-31T00:00:00Z',
};

describe('S14 DiagnosisResult (AGRI-171)', () => {
  it('S14-T1: formats 0.75 as 75,0%, displays warning, and hides medicines when <= 0.80', async () => {
    await render(
      <DiagnosisResultScreen
        result={baseResult}
        localImageUri="file:///leaf.jpg"
        isAuthenticated={false}
        onNewDiagnosis={jest.fn()}
        onLoginToSave={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    expect(screen.getByText('75,0%')).toBeVisible();
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.queryByText('Thuốc không nên hiện khi <= 80%')).toBeNull();
  });

  it('S14-T2: saves guest prediction via POST /api/predictions/guest/save without re-inference', async () => {
    const request = jest.fn().mockResolvedValue({ status: 201, json: async () => ({}) });
    const apiRes = await saveGuestPrediction({
      guestToken: 'g'.repeat(64),
      readToken: async () => 'jwt-token',
      request,
      apiOrigin: 'https://api.example.test',
    });
    expect(apiRes).toEqual({ kind: 'saved' });
    expect(request).toHaveBeenCalledWith(
      'https://api.example.test/api/predictions/guest/save',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ guestToken: 'g'.repeat(64) }),
      }),
    );

    const onSaveGuest = jest.fn().mockResolvedValue({ kind: 'saved' });
    await render(
      <DiagnosisResultScreen
        result={baseResult}
        localImageUri="file:///leaf.jpg"
        isAuthenticated
        onNewDiagnosis={jest.fn()}
        onSaveGuest={onSaveGuest}
        onBack={jest.fn()}
      />,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Lưu kết quả' }));
    expect(onSaveGuest).toHaveBeenCalledWith('g'.repeat(64));
    expect(await screen.findByRole('header', { name: 'Đã lưu vào lịch sử' })).toBeVisible();
  });

  it('S14-T3: shows expired guest notice and informationPending notice without inventing medicines', async () => {
    await render(
      <DiagnosisResultScreen
        result={{
          ...baseResult,
          informationPending: true,
          guestExpiresAt: '2020-01-01T00:00:00Z',
        }}
        localImageUri="file:///leaf.jpg"
        isAuthenticated={false}
        onNewDiagnosis={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    expect(screen.getByText('Thông tin đang được cập nhật.')).toBeVisible();
    expect(screen.getByText('Kết quả khách này đã hết thời hạn lưu vào tài khoản.')).toBeVisible();
  });
});

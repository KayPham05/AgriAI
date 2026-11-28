import { render, screen, userEvent } from '@testing-library/react-native';

import { AnalyzingScreen } from '@/features/diagnosis/screens/AnalyzingScreen';
import type { PredictionResult } from '@/features/diagnosis/submitPrediction';

const sampleResult: PredictionResult = {
  id: 'pred-123',
  imagePath: '/img.jpg',
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
  },
  predictionDetails: [],
  images: [],
  hasHistoricalSnapshot: false,
  informationPending: false,
  recommendedMedicines: [],
};

describe('S13 Analyzing (AGRI-170)', () => {
  it('S13-T1: single-flight guard runs only one POST on mount', async () => {
    const onSubmit = jest.fn(() => new Promise<never>(() => undefined));
    await render(
      <AnalyzingScreen
        image={{ uri: 'file:///leaf.jpg', fileName: 'leaf.jpg', mimeType: 'image/jpeg' }}
        isAuthenticated={false}
        onSubmit={onSubmit}
        onCompleted={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('header', { name: 'Đang gửi ảnh và phân tích...' })).toBeVisible();
  });

  it('S13-T2: navigates to result once on 200/201 without re-POSTing', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ kind: 'succeeded', result: sampleResult });
    const onCompleted = jest.fn();

    await render(
      <AnalyzingScreen
        image={{ uri: 'file:///leaf.jpg', fileName: 'leaf.jpg', mimeType: 'image/jpeg' }}
        isAuthenticated
        onSubmit={onSubmit}
        onCompleted={onCompleted}
        onCancel={jest.fn()}
      />,
    );

    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(onCompleted).toHaveBeenCalledWith(sampleResult);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('S13-T3: timeout advises User to check History and never auto-POSTs', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ kind: 'error', reason: 'timeout' });
    const onOpenHistory = jest.fn();
    const user = userEvent.setup();

    await render(
      <AnalyzingScreen
        image={{ uri: 'file:///leaf.jpg', fileName: 'leaf.jpg', mimeType: 'image/jpeg' }}
        isAuthenticated
        onSubmit={onSubmit}
        onCompleted={jest.fn()}
        onCancel={jest.fn()}
        onOpenHistory={onOpenHistory}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Hãy kiểm tra lịch sử trước khi gửi lại để tránh tạo lượt trùng.',
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await user.press(screen.getByRole('button', { name: 'Xem lịch sử' }));
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });
});

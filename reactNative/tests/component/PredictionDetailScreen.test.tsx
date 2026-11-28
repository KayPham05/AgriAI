import { render, screen, userEvent } from '@testing-library/react-native';

import type { PredictionResult } from '@/features/diagnosis/submitPrediction';
import { PredictionDetailScreen } from '@/features/history/screens/PredictionDetailScreen';

const snapshotDetail: PredictionResult = {
  id: 'pred-16',
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
    diseaseVietnameseName: 'Đốm nâu (snapshot cũ)',
  },
  predictionDetails: [],
  images: [{ id: 'img-1', confidence: 0.75, expiresAt: '2026-11-29T00:00:00Z', isExpired: true }],
  hasHistoricalSnapshot: true,
  informationPending: false,
  recommendedMedicines: [],
  agriculturalProfileId: 'prof-1',
};

describe('S16 PredictionDetail (AGRI-173)', () => {
  it('S16-T1: renders historical snapshot label and preserved disease name', async () => {
    await render(
      <PredictionDetailScreen
        detail={snapshotDetail}
        profiles={[{ id: 'prof-1', name: 'Ruộng lúa OM18', description: null, predictionCount: 1, createdAt: '', updatedAt: '' }]}
        onBack={jest.fn()}
      />,
    );

    expect(screen.getByText('Bản lưu lịch sử (snapshot)')).toBeVisible();
    expect(screen.getByRole('header', { name: 'Đốm nâu (snapshot cũ)' })).toBeVisible();
    expect(screen.getByText('Ruộng lúa OM18')).toBeVisible();
  });

  it('S16-T2: confirms deletion, executes 204 delete, and navigates back to list', async () => {
    const onDelete = jest.fn().mockResolvedValue({ kind: 'ok' });
    const onDeleted = jest.fn();
    const user = userEvent.setup();

    await render(
      <PredictionDetailScreen
        detail={snapshotDetail}
        onDelete={onDelete}
        onDeleted={onDeleted}
        onBack={jest.fn()}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Xóa' }));
    expect(screen.getByRole('header', { name: 'Xóa kết quả chẩn đoán' })).toBeVisible();
    await user.press(screen.getByRole('button', { name: 'Xóa kết quả' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it('S16-T3: shows expired image placeholder while keeping metadata, and hides data on 404', async () => {
    const view = await render(
      <PredictionDetailScreen detail={snapshotDetail} onBack={jest.fn()} />,
    );

    expect(screen.getByText('Ảnh gốc đã hết thời hạn lưu')).toBeVisible();
    expect(screen.getByRole('header', { name: 'Đốm nâu (snapshot cũ)' })).toBeVisible();

    await view.rerender(
      <PredictionDetailScreen detail={null} notFound onBack={jest.fn()} />,
    );
    expect(screen.getByRole('header', { name: 'Không tìm thấy kết quả' })).toBeVisible();
    expect(screen.queryByText('Đốm nâu (snapshot cũ)')).toBeNull();
  });
});

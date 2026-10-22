import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DiagnosisResult } from '@/types';
import { HistoryPage } from '@/views/HistoryPage';

const result: DiagnosisResult = {
  id: 'history-rice-brown-spot',
  timestamp: '16:00 17/10/2026',
  plant: 'Lúa',
  prediction: 'Đốm nâu',
  confidence: 0.9,
  confidenceCategory: 'Độ tin cậy cao',
  top_predictions: [],
  originalImageUrl: '/fixtures/rice.jpg',
  gradcam_url: '',
  severity: null,
  modelVersion: 'convnext-tiny-v1.4',
};

function showHistory(history: DiagnosisResult[] = [result]) {
  const onSelectResult = vi.fn();
  const onDeleteResult = vi.fn();
  const onNavigateDiagnose = vi.fn();
  render(
    <HistoryPage
      history={history}
      onSelectResult={onSelectResult}
      onDeleteResult={onDeleteResult}
      onNavigateDiagnose={onNavigateDiagnose}
    />,
  );
  return { onSelectResult, onDeleteResult, onNavigateDiagnose };
}

describe('HistoryPage interactions', () => {
  it('offers diagnosis from an empty history', async () => {
    const { onNavigateDiagnose } = showHistory([]);
    expect(screen.getByRole('heading', { name: 'Chưa có mẫu nào được lưu' })).toBeVisible();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra lá' }));
    expect(onNavigateDiagnose).toHaveBeenCalledOnce();
  });

  it('opens the selected result in either list or grid view', async () => {
    const { onSelectResult } = showHistory();
    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: 'Dạng danh sách' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Dạng lưới' }));
    expect(screen.getByRole('button', { name: 'Dạng lưới' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Xem chi tiết' }));
    expect(onSelectResult).toHaveBeenCalledExactlyOnceWith(result);
  });

  it('searches by disease name and resets an unmatched search', async () => {
    showHistory([
      result,
      { ...result, id: 'history-coffee-rust', plant: 'Cà phê', prediction: 'Gỉ sắt' },
    ]);
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox', { name: 'Tìm cây hoặc tên bệnh' }), 'gỈ SẮT');
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1));
    expect(screen.getByRole('heading', { name: 'Gỉ sắt' })).toBeVisible();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'không tồn tại');
    expect(
      await screen.findByRole('heading', { name: 'Không tìm thấy kết quả phù hợp' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Đặt lại bộ lọc' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('cancels deletion without deleting and confirms exactly the selected ID', async () => {
    const { onDeleteResult } = showHistory();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Xóa kết quả Đốm nâu' }));
    expect(screen.getByRole('alertdialog')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Hủy bỏ' }));
    expect(onDeleteResult).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Xóa kết quả Đốm nâu' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));
    expect(onDeleteResult).toHaveBeenCalledExactlyOnceWith(result.id);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

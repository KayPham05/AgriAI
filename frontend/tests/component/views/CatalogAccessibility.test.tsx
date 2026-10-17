import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DiagnosisResult } from '@/types';
import { DiseasesPage } from '@/views/DiseasesPage';
import { HistoryPage } from '@/views/HistoryPage';
import { PlantsPage } from '@/views/PlantsPage';

describe('catalog control groups', () => {
  it('keeps the empty-history next action without presenting invented results', async () => {
    const onNavigateDiagnose = vi.fn();
    const user = userEvent.setup();
    render(
      <HistoryPage
        history={[]}
        onSelectResult={vi.fn()}
        onDeleteResult={vi.fn()}
        onNavigateDiagnose={onNavigateDiagnose}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Chưa có mẫu nào được lưu' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Xem chi tiết' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kiểm tra lá' }));
    expect(onNavigateDiagnose).toHaveBeenCalledOnce();
  });

  it('names the plant filters and exposes the selected category', async () => {
    const user = userEvent.setup();
    render(<PlantsPage plants={[]} onSelectPlant={vi.fn()} onDiagnosePlant={vi.fn()} />);

    const filters = within(screen.getByRole('group', { name: 'Nhóm cây' }));
    await user.click(filters.getByRole('button', { name: 'Cây ăn trái' }));
    expect(filters.getByRole('button', { name: 'Cây ăn trái' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(filters.getByRole('button', { name: 'Tất cả' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('names the disease filters and exposes the selected category', async () => {
    const user = userEvent.setup();
    render(
      <DiseasesPage diseases={[]} onSelectDisease={vi.fn()} onDiagnoseDiseasePlant={vi.fn()} />,
    );

    const filters = within(screen.getByRole('group', { name: 'Nhóm bệnh' }));
    await user.click(filters.getByRole('button', { name: 'Nấm' }));
    expect(filters.getByRole('button', { name: 'Nấm' })).toHaveAttribute('aria-pressed', 'true');
    expect(filters.getByRole('button', { name: 'Tất cả' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('names the history display controls and exposes the chosen view', async () => {
    const user = userEvent.setup();
    const result: DiagnosisResult = {
      id: 'saved-leaf',
      timestamp: '08/10/2026 10:00',
      plant: 'Cà chua',
      prediction: 'Khỏe mạnh',
      confidence: 0.94,
      confidenceCategory: 'Độ tin cậy cao',
      top_predictions: [{ label: 'Khỏe mạnh', confidence: 0.94 }],
      originalImageUrl: '/images/leaf.jpg',
      gradcam_url: '',
      severity: null,
      modelVersion: 'test-model',
    };
    render(
      <HistoryPage
        history={[result]}
        onSelectResult={vi.fn()}
        onDeleteResult={vi.fn()}
        onNavigateDiagnose={vi.fn()}
      />,
    );

    const controls = within(screen.getByRole('group', { name: 'Cách hiển thị' }));
    await user.click(controls.getByRole('button', { name: 'Dạng lưới' }));
    expect(controls.getByRole('button', { name: 'Dạng lưới' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(controls.getByRole('button', { name: 'Dạng danh sách' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

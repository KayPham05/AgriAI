import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AnalysisResultCard } from '@/components/diagnosis/AnalysisResultCard';
import { successfulPrediction } from '../../helpers/prediction';

describe('AnalysisResultCard', () => {
  it('uses available catalog advice and does not invent extra predictions', () => {
    const result = {
      ...successfulPrediction,
      dto: {
        ...successfulPrediction.dto,
        predictedPlantDisease: {
          ...successfulPrediction.dto.predictedPlantDisease,
          disease: {
            ...successfulPrediction.dto.predictedPlantDisease.disease,
            symptoms: 'Đốm tròn có vòng đồng tâm trên lá.',
            treatment: 'Đối chiếu tình trạng cây với cán bộ kỹ thuật.',
          },
        },
      },
    };
    render(<AnalysisResultCard analysisResult={result} isLoading={false} />);
    expect(screen.getByText('Đốm tròn có vòng đồng tâm trên lá.')).toBeVisible();
    expect(screen.getByText('Đối chiếu tình trạng cây với cán bộ kỹ thuật.')).toBeVisible();
    expect(
      within(screen.getByRole('list', { name: 'Dự đoán Top-3' })).getAllByRole('listitem'),
    ).toHaveLength(1);
  });

  it('does not offer retry when no valid image is available', () => {
    render(<AnalysisResultCard analysisResult={null} isLoading={false} error="Ảnh không hợp lệ" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Ảnh không hợp lệ');
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull();
  });

  it('guides users to analyze an image when no result is available', () => {
    render(<AnalysisResultCard analysisResult={null} isLoading={false} />);
    expect(
      screen.getByRole('heading', { name: 'Kết quả chẩn đoán sẽ xuất hiện tại đây' }),
    ).toBeVisible();
    expect(screen.getByText('Phân tích ngay').tagName).toBe('STRONG');
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it.each([true, false])(
    'shows live loading instead of a stale result, uploading=%s',
    (isUploading) => {
      render(
        <AnalysisResultCard
          analysisResult={successfulPrediction}
          isLoading
          isUploading={isUploading}
        />,
      );
      expect(screen.getByRole('region', { name: 'Kết quả phân tích' })).toHaveAttribute(
        'aria-busy',
        'true',
      );
      expect(screen.getByRole('status')).toHaveTextContent(
        isUploading ? 'Đang tải ảnh lên' : 'Đang phân loại ảnh lá',
      );
      expect(screen.queryByRole('heading', { name: 'Bệnh cháy lá sớm' })).toBeNull();
    },
  );

  it('renders actual probabilities and missing catalog information without inventing data', () => {
    const result = {
      ...successfulPrediction,
      diagnosis: {
        ...successfulPrediction.diagnosis,
        top_predictions: [
          { label: 'Bệnh cháy lá sớm', confidence: 0.94 },
          { label: 'Lá khỏe mạnh', confidence: 0.04 },
          { label: 'Đốm lá', confidence: 0.02 },
        ],
      },
    };
    render(<AnalysisResultCard analysisResult={result} isLoading={false} />);
    expect(screen.getByRole('heading', { name: 'Bệnh cháy lá sớm' })).toBeVisible();
    const rankings = within(screen.getByRole('list', { name: 'Dự đoán Top-3' }));
    expect(rankings.getAllByRole('listitem')).toHaveLength(3);
    expect(rankings.getByText('4.0%')).toBeVisible();
    expect(rankings.getByText('2.0%')).toBeVisible();
    expect(screen.getByText('Chưa có triệu chứng trong cẩm nang.')).toBeVisible();
    expect(screen.getByText('Chưa có khuyến nghị xử lý trong cẩm nang.')).toBeVisible();
  });

  it('shows the API error and allows retry without showing stale results', async () => {
    const retry = vi.fn();
    render(
      <AnalysisResultCard
        analysisResult={successfulPrediction}
        isLoading={false}
        error="API tạm thời không khả dụng"
        onRetry={retry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('API tạm thời không khả dụng');
    expect(screen.queryByRole('heading', { name: 'Bệnh cháy lá sớm' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

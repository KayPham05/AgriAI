import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnalysisStepper } from '@/components/diagnosis/AnalysisStepper';

describe('AnalysisStepper', () => {
  it('asks for an image without claiming work has started', () => {
    render(<AnalysisStepper currentStep={1} />);
    expect(screen.getByText('CHỌN ẢNH')).toBeVisible();
    expect(screen.queryByText('ĐANG THỰC HIỆN')).toBeNull();
    expect(screen.getByText('Phân tích')).toBeVisible();
  });
  it('does not label a blocked result as completed', () => {
    render(<AnalysisStepper currentStep={3} hasIssue />);
    expect(screen.getByText('CẦN KIỂM TRA')).toBeVisible();
    expect(screen.queryByText('ĐÃ HOÀN TẤT')).toBeNull();
    expect(screen.getAllByLabelText('Đã hoàn thành')).toHaveLength(2);
  });
  it.each([1, 2, 3] as const)(
    'tracks step %s and completes the flow when results are ready',
    (step) => {
      render(<AnalysisStepper currentStep={step} hasImage />);
      const items = within(screen.getByRole('list', { name: 'Tiến trình phân tích' })).getAllByRole(
        'listitem',
      );
      expect(items).toHaveLength(3);
      expect(items[step - 1]).toHaveAttribute('aria-current', 'step');
      if (step === 3) {
        expect(screen.queryByText('ĐANG THỰC HIỆN')).toBeNull();
        expect(screen.getByText('ĐÃ HOÀN TẤT')).toBeVisible();
        expect(screen.getAllByLabelText('Đã hoàn thành')).toHaveLength(3);
      } else {
        expect(screen.getAllByText('ĐANG THỰC HIỆN')).toHaveLength(1);
        expect(screen.queryByText('ĐÃ HOÀN TẤT')).toBeNull();
        expect(screen.queryAllByLabelText('Đã hoàn thành')).toHaveLength(step - 1);
      }
      items.forEach((item, index) => {
        if (index !== step - 1) expect(item).not.toHaveAttribute('aria-current');
      });
      expect(screen.getByText('Chọn ảnh lá')).toBeVisible();
      expect(screen.getByText('Kết quả & Đối chiếu')).toBeVisible();
    },
  );
});

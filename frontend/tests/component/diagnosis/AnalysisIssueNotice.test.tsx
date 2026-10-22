import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AnalysisIssueNotice } from '@/components/diagnosis/AnalysisIssueNotice';
import { DIAGNOSIS_ISSUE_CODES } from '@/features/diagnosis/diagnosisIssues';

describe('AnalysisIssueNotice', () => {
  it.each(DIAGNOSIS_ISSUE_CODES)('renders recovery guidance for %s', (code) => {
    render(
      <AnalysisIssueNotice
        issue={{ code }}
        onChooseImage={vi.fn()}
        onChooseSample={vi.fn()}
        onRetry={vi.fn()}
        onShowSupported={vi.fn()}
        onViewComparison={vi.fn()}
      />,
    );
    const alert = within(screen.getByRole('alert'));
    expect(alert.getByRole('heading')).toBeVisible();
    expect(alert.getByRole('list', { name: 'Mẹo chụp ảnh' })).toBeVisible();
    expect(alert.getAllByRole('button').length).toBeGreaterThan(0);
  });
  it('requests a new image and a sample for no-leaf recovery', async () => {
    const choose = vi.fn();
    const sample = vi.fn();
    render(
      <AnalysisIssueNotice
        issue={{ code: 'NO_LEAF_DETECTED' }}
        onChooseImage={choose}
        onChooseSample={sample}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Chọn ảnh khác' }));
    await userEvent.click(screen.getByRole('button', { name: 'Chọn mẫu thử' }));
    expect(choose).toHaveBeenCalledOnce();
    expect(sample).toHaveBeenCalledOnce();
  });
  it('retries a server failure while preserving its actionable message', async () => {
    const retry = vi.fn();
    render(
      <AnalysisIssueNotice
        issue={{ code: 'SERVER_TIMEOUT_OR_ERROR', detail: 'Không thể kết nối backend.' }}
        onChooseImage={vi.fn()}
        onRetry={retry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể kết nối backend.');
    await userEvent.click(screen.getByRole('button', { name: 'Phân tích lại ngay' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

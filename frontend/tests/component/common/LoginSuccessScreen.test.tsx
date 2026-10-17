import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginSuccessScreen } from '@/components/common/LoginSuccessScreen';

describe('LoginSuccessScreen', () => {
  it('shows only the brand and account greeting while connecting', () => {
    const onAnimationComplete = vi.fn();
    render(
      <LoginSuccessScreen
        userName="Nguyễn Văn An"
        onAnimationComplete={onAnimationComplete}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('status', { name: 'Đang kết nối AgriAI' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('heading', { name: 'Chào Nguyễn Văn An.' })).toBeVisible();
    expect(screen.queryByRole('button')).toBeNull();
    expect(onAnimationComplete).toHaveBeenCalledOnce();
  });
  it('offers recovery actions only when startup fails', async () => {
    const onRetry = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <LoginSuccessScreen
        userName="Nguyễn Văn An"
        onAnimationComplete={vi.fn()}
        onRetry={onRetry}
        onCancel={onCancel}
        error="Không thể kết nối."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể kết nối.');
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    await user.click(screen.getByRole('button', { name: 'Về trang giới thiệu' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

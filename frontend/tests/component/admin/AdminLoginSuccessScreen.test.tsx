import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminLoginSuccessScreen } from '@/features/admin/AdminLoginSuccessScreen';

afterEach(() => vi.useRealTimers());

describe('AdminLoginSuccessScreen', () => {
  it('greets the actual admin and waits four seconds before entering the dashboard', () => {
    vi.useFakeTimers();
    const complete = vi.fn();
    render(
      <AdminLoginSuccessScreen
        userName="System Admin"
        onAnimationComplete={complete}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Xin chào, System Admin.' })).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Đang tải' })).toBeVisible();
    act(() => vi.advanceTimersByTime(3999));
    expect(complete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(complete).toHaveBeenCalledOnce();
  });
  it('cancels the pending entrance when unmounted', () => {
    vi.useFakeTimers();
    const complete = vi.fn();
    const { unmount } = render(
      <AdminLoginSuccessScreen
        userName="Admin"
        onAnimationComplete={complete}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    unmount();
    act(() => vi.advanceTimersByTime(5000));
    expect(complete).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('pauses decorative motion in a hidden tab', () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    render(
      <AdminLoginSuccessScreen
        userName="Admin"
        onAnimationComplete={vi.fn()}
        onRetry={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    hidden.mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.getByRole('status')).toHaveAttribute('data-paused', 'true');
    hidden.mockRestore();
  });
  it('keeps recovery actions and does not enter while startup failed', async () => {
    const retry = vi.fn();
    const cancel = vi.fn();
    render(
      <AdminLoginSuccessScreen
        userName="Admin"
        error="Không thể kết nối."
        onAnimationComplete={vi.fn()}
        onRetry={retry}
        onCancel={cancel}
      />,
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể kết nối.');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await userEvent.click(screen.getByRole('button', { name: 'Về trang giới thiệu' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });
});

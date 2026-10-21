import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReloadLoadingScreen } from '@/components/common/ReloadLoadingScreen';

afterEach(() => vi.useRealTimers());

describe('ReloadLoadingScreen', () => {
  it('provides a named loading state without a fabricated percentage', () => {
    render(<ReloadLoadingScreen />);
    expect(screen.getByRole('status', { name: 'Đang tải AgriAI' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('');
    expect(screen.queryByText('Đang chuẩn bị trang…')).toBeNull();
    expect(screen.queryByText(/\d+%/)).toBeNull();
  });

  it('offers retry and cancellation on a real loading error', () => {
    const retry = vi.fn();
    const cancel = vi.fn();
    render(<ReloadLoadingScreen error="Không thể kết nối." onRetry={retry} onCancel={cancel} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể kết nối.');
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('offers recovery after a stalled load and cleans up its timer', () => {
    vi.useFakeTimers();
    const { unmount } = render(<ReloadLoadingScreen onRetry={vi.fn()} />);
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByRole('alert')).toHaveTextContent('Kết nối đang lâu hơn dự kiến');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(screen.queryByRole('alert')).toBeNull();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

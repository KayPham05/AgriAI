import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SeedlingLoadingScreen } from '@/components/common/SeedlingLoadingScreen';

afterEach(() => vi.useRealTimers());

describe('reference seedling loading', () => {
  it('uses a farewell and finished status for logout', () => {
    render(<SeedlingLoadingScreen mode="logout" userName="Nguyễn Văn An" />);
    expect(screen.getByRole('heading', { name: 'Tạm biệt, Nguyễn Văn An.' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false');
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByText('HẸN GẶP LẠI')).toBeVisible();
    expect(screen.queryByText('Xin chào, Nguyễn Văn An.')).toBeNull();
  });

  it('does not turn a completed logout into a connection timeout', () => {
    vi.useFakeTimers();
    render(<SeedlingLoadingScreen mode="logout" />);
    act(() => vi.advanceTimersByTime(20_001));
    expect(screen.getByRole('heading', { name: 'Tạm biệt.' })).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('greets the supplied verified user and preserves the existing brand', () => {
    render(<SeedlingLoadingScreen userName="  Nguyễn Văn An  " />);
    expect(screen.getByRole('heading', { name: 'Xin chào, Nguyễn Văn An.' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'AgriAI' })).toHaveAttribute(
      'src',
      expect.stringContaining('agriai-leaf-mark.png'),
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('progressbar', { name: 'Đang tải' })).not.toHaveAttribute(
      'aria-valuenow',
    );
    expect(screen.getByText('Nguyễn Văn An')).toBeVisible();
    expect(screen.getByText('ĐANG TẢI')).toBeVisible();
  });

  it('uses a generic greeting until the account is known', () => {
    render(<SeedlingLoadingScreen userName=" " />);
    expect(screen.getByRole('heading', { name: 'Xin chào.' })).toBeVisible();
  });

  it('shows real errors and keeps retry and cancel usable', () => {
    const retry = vi.fn();
    const cancel = vi.fn();
    render(<SeedlingLoadingScreen error="Không thể kết nối." onRetry={retry} onCancel={cancel} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể kết nối.');
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'false');
    act(() => screen.getByRole('button', { name: 'Thử lại' }).click());
    act(() => screen.getByRole('button', { name: 'Về trang giới thiệu' }).click());
    expect(retry).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('offers recovery after a stalled request instead of looping forever', () => {
    vi.useFakeTimers();
    render(<SeedlingLoadingScreen />);
    act(() => vi.advanceTimersByTime(20_001));
    expect(screen.getByRole('alert')).toHaveTextContent('Kết nối đang lâu hơn dự kiến.');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeEnabled();
  });

  it('cleans up the recovery timer on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(<SeedlingLoadingScreen />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

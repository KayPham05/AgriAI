import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginSuccessScreen } from './LoginSuccessScreen';

describe('LoginSuccessScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('splits the logo before entering the main application', () => {
    const onEnterApp = vi.fn();
    render(<LoginSuccessScreen userName="Nguyễn Văn An" onEnterApp={onEnterApp} />);

    act(() => vi.advanceTimersByTime(800));
    const logoButton = screen.getByRole('button', { name: /vào ứng dụng LeafAI/i });
    fireEvent.click(logoButton);

    expect(logoButton).toHaveClass('login-success-logo-btn--spinning');
    act(() => vi.advanceTimersByTime(650));
    expect(logoButton).toHaveClass('login-success-logo-btn--splitting');
    expect(onEnterApp).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(900));
    expect(onEnterApp).toHaveBeenCalledOnce();
  });
});

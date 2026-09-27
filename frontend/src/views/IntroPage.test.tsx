import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IntroPage } from './IntroPage';

describe('IntroPage', () => {
  it('introduces LeafAI and routes each primary action correctly', async () => {
    // Arrange
    const onLogin = vi.fn();
    const onRegister = vi.fn();
    render(<IntroPage onLogin={onLogin} onRegister={onRegister} />);

    // Assert
    expect(screen.getByRole('heading', { name: /Hiểu từng.*chiếc lá/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Logo LeafAI' })).toHaveAttribute('src', '/images/logo.png');
    expect(screen.getAllByText('ConvNeXt-Tiny').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('article')).toHaveLength(3);

    // Act
    await userEvent.click(screen.getByRole('button', { name: /Bắt đầu miễn phí/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

    // Assert
    expect(onRegister).toHaveBeenCalledOnce();
    expect(onLogin).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: /Khám phá bản demo/i })).not.toBeInTheDocument();
  });
});

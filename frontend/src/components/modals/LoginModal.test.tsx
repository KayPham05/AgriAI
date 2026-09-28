import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginModal } from './LoginModal';

describe('LoginModal entry mode', () => {
  it('opens directly on registration when requested from the intro page', () => {
    render(
      <LoginModal
        isOpen
        initialMode="register"
        onClose={vi.fn()}
        onAuthSuccess={vi.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Đăng ký' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('img', { name: 'Logo LeafAI' })).toHaveAttribute('src', '/images/logo.png');
    expect(screen.getByRole('heading', { name: /Bắt đầu hành trình xanh/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Họ và tên/i)).toBeInTheDocument();
  });

  it('requires accepting the terms before registration', async () => {
    const user = userEvent.setup();
    render(<LoginModal isOpen initialMode="register" onClose={vi.fn()} onAuthSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/Họ và tên/i), 'Nguyễn Văn An');
    await user.type(screen.getByLabelText(/^Email$/i), 'an@example.com');
    await user.type(screen.getByLabelText(/^Mật khẩu$/i), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(screen.getByText(/cần đồng ý với điều khoản/i)).toBeInTheDocument();
    expect(screen.getByText(/Sao chép, chiếm đoạt, sửa đổi/i)).toBeInTheDocument();
  });

  it('requires the correct CAPTCHA before login', async () => {
    const user = userEvent.setup();
    render(<LoginModal isOpen initialMode="login" onClose={vi.fn()} onAuthSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/^Email$/i), 'an@example.com');
    await user.type(screen.getByLabelText(/^Mật khẩu$/i), 'secret123');
    await user.type(screen.getByLabelText(/Mã xác nhận/i), 'SAI99');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(screen.getByText(/CAPTCHA chưa chính xác/i)).toBeInTheDocument();
  });
});

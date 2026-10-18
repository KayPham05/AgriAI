import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginModal } from '@/components/modals/LoginModal';

describe('LoginModal entry mode', () => {
  it('exposes the CAPTCHA and its refresh action as a named group', () => {
    render(<LoginModal isOpen onClose={vi.fn()} onAuthSuccess={vi.fn()} />);

    const captcha = screen.getByRole('group', { name: /^Mã CAPTCHA: / });
    expect(within(captcha).getByRole('button', { name: 'Tạo mã CAPTCHA mới' })).toBeEnabled();
  });

  it('opens directly on registration when requested from the intro page', () => {
    render(<LoginModal isOpen initialMode="register" onClose={vi.fn()} onAuthSuccess={vi.fn()} />);

    expect(screen.getByRole('tab', { name: 'Đăng ký' })).toHaveAttribute('aria-selected', 'true');
    const logoSource = screen.getByRole('img', { name: 'Logo AgriAI' }).getAttribute('src');
    expect(logoSource).not.toBeNull();
    expect(new URL(logoSource ?? '', 'http://localhost').searchParams.get('url')).toBe(
      '/images/logo.png',
    );
    expect(screen.getByRole('heading', { name: /Tạo tài khoản AgriAI/i })).toBeInTheDocument();
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

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginModal } from '@/components/modals/LoginModal';

afterEach(() => vi.unstubAllGlobals());

describe('LoginModal entry mode', () => {
  it('keeps one supplied muted looping video in the shared background across auth modes', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    render(<LoginModal isOpen onClose={vi.fn()} onAuthSuccess={vi.fn()} />);
    const panel = screen.getByRole('dialog').querySelector('[data-auth-background]');
    const video = panel?.querySelector('video');
    expect(video).toHaveAttribute(
      'src',
      'https://pub-5b7b85dc2aa84f1ca62aa18308983f37.r2.dev/auth/field-v1.mp4',
    );
    expect(video).toHaveAttribute(
      'poster',
      'https://pub-5b7b85dc2aa84f1ca62aa18308983f37.r2.dev/auth/field-poster-v1.webp',
    );
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveAttribute('playsinline');
    expect(video?.muted).toBe(true);
    expect(screen.queryByRole('button', { name: /video nền/ })).toBeNull();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('tab', { name: 'Đăng ký' }));
    expect(panel?.querySelector('video')).toBe(video);
    fireEvent.error(video as HTMLVideoElement);
    expect(panel?.querySelector('video')).toBeNull();
    expect(panel?.querySelector('img[alt=""]')).toHaveAttribute(
      'src',
      'https://pub-5b7b85dc2aa84f1ca62aa18308983f37.r2.dev/auth/field-poster-v1.webp',
    );
    const poster = panel?.querySelector('img[alt=""]');
    if (!poster) throw new Error('Expected video fallback poster');
    fireEvent.error(poster);
    expect(panel?.querySelector('img[alt=""]')).toBeNull();
  });
  it('uses the still frame without loading video when desktop motion is not enabled', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(<LoginModal isOpen onClose={vi.fn()} onAuthSuccess={vi.fn()} />);
    const panel = screen.getByRole('dialog').querySelector('[data-auth-background]');
    expect(panel?.querySelector('video')).toBeNull();
    expect(panel?.querySelector('img[alt=""]')).not.toBeNull();
  });
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
      '/images/agriai-leaf-mark.png',
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

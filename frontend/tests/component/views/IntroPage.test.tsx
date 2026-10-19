import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IntroPage } from '@/views/IntroPage';

describe('IntroPage', () => {
  it('includes the supplied grape photograph in the introductory film strip', () => {
    render(<IntroPage onLogin={vi.fn()} onRegister={vi.fn()} />);
    const strip = screen.getByRole('region', { name: 'Dải ảnh cây trồng' });
    expect(
      decodeURIComponent(
        decodeURIComponent(
          within(strip)
            .getByRole('img', { name: 'Thu hoạch chùm nho tím trên giàn nho' })
            .getAttribute('src') ?? '',
        ),
      ),
    ).toContain('nho banner.jpg');
  });
  it('wraps keyboard navigation from the last crop to the first and back', () => {
    render(<IntroPage onLogin={vi.fn()} onRegister={vi.fn()} />);
    const strip = screen.getByRole('region', { name: 'Dải ảnh cây trồng' });
    Object.defineProperties(strip, {
      clientWidth: { value: 400 },
      scrollWidth: { value: 4200 },
      scrollTo: {
        value: ({ left }: ScrollToOptions) => {
          strip.scrollLeft = left ?? 0;
        },
      },
    });
    strip.scrollLeft = 1400;
    fireEvent.keyDown(strip, { key: 'ArrowRight' });
    expect(strip.scrollLeft).toBe(1500);
    fireEvent.keyDown(strip, { key: 'End' });
    expect(strip.scrollLeft).toBe(2700);
    fireEvent.keyDown(strip, { key: 'ArrowRight' });
    expect(strip.scrollLeft).toBe(1400);
    fireEvent.keyDown(strip, { key: 'ArrowLeft' });
    expect(strip.scrollLeft).toBe(2700);
    fireEvent.keyDown(strip, { key: 'Home' });
    expect(strip.scrollLeft).toBe(1400);
  });

  it('lets visitors explore the crop map before signing in', async () => {
    render(<IntroPage onLogin={vi.fn()} onRegister={vi.fn()} />);

    const hero = screen.getByRole('region', { name: 'Giới thiệu AgriAI' });
    const map = within(hero).getByRole('region', { name: 'Bản đồ cây trồng Việt Nam' });
    expect(within(hero).getByRole('heading', { level: 1 })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Banner AgriAI' })).toBeNull();
    expect(screen.getAllByRole('region', { name: 'Bản đồ cây trồng Việt Nam' })).toHaveLength(1);
    await userEvent.click(within(map).getByRole('button', { name: 'Xem Cà phê tại Đắk Lắk' }));

    const panel = within(hero).getByRole('region', { name: 'Đắk Lắk' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(panel).getByRole('heading', { name: 'Cà phê' })).toBeVisible();
    expect(within(panel).getByRole('link', { name: 'Nguồn vùng trồng' })).toBeVisible();
    expect(within(panel).queryByRole('button', { name: 'Xem cây trong cẩm nang' })).toBeNull();
    expect(within(hero).queryByRole('heading', { level: 1 })).toBeNull();
    expect(within(hero).queryByRole('region', { name: 'Dải ảnh cây trồng' })).toBeNull();
    expect(within(hero).getByRole('region', { name: 'Bản đồ cây trồng Việt Nam' })).toBe(map);

    const cornPin = within(map).getByRole('button', { name: 'Xem Bắp (Ngô) tại Sơn La' });
    await userEvent.click(cornPin);
    expect(within(hero).getByRole('region', { name: 'Sơn La' })).toBe(panel);
    expect(within(panel).getByRole('heading', { name: 'Bắp (Ngô)' })).toBeVisible();
    expect(cornPin).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(panel).getByRole('button', { name: 'Đóng thông tin địa điểm' }));
    expect(within(hero).getByRole('heading', { level: 1 })).toBeVisible();
    expect(within(hero).getByRole('region', { name: 'Dải ảnh cây trồng' })).toBeVisible();
    expect(within(hero).queryByRole('region', { name: 'Sơn La' })).toBeNull();
    await userEvent.click(cornPin);
    await userEvent.keyboard('{Escape}');
    expect(cornPin).toHaveFocus();
    expect(within(hero).getByRole('heading', { level: 1 })).toBeVisible();
  });

  it('introduces AgriAI and routes each primary action correctly', async () => {
    // Arrange
    const onLogin = vi.fn();
    const onRegister = vi.fn();
    render(<IntroPage onLogin={onLogin} onRegister={onRegister} />);

    // Assert
    expect(screen.getByRole('heading', { name: /Nhìn kỹ chiếc lá/i })).toBeInTheDocument();
    const logoSource = screen.getByRole('img', { name: 'Logo AgriAI' }).getAttribute('src');
    expect(logoSource).not.toBeNull();
    expect(new URL(logoSource ?? '', 'http://localhost').searchParams.get('url')).toBe(
      '/images/logo.png',
    );
    expect(screen.getAllByText('ConvNeXt-Tiny').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('article')).toHaveLength(3);

    // Act
    await userEvent.click(screen.getAllByRole('button', { name: /Tạo tài khoản/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

    // Assert
    expect(onRegister).toHaveBeenCalledOnce();
    expect(onLogin).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: /Khám phá bản demo/i })).not.toBeInTheDocument();
  });
});

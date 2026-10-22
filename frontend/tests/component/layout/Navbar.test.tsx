import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Navbar } from '@/components/layout/Navbar';

const profile = {
  name: 'Nguyễn Văn An',
  email: 'an@example.com',
  avatarUrl: '',
  role: 'Thành viên AgriAI',
  location: '',
  joinedDate: '07/10/2026',
};

describe('Navbar', () => {
  it('exposes app destinations as real links that can open in another tab', () => {
    render(
      <Navbar
        currentTab="home"
        unreadNotificationsCount={0}
        onOpenNotifications={vi.fn()}
        userProfile={profile}
        isAuthenticated
        onOpenLogin={vi.fn()}
      />,
    );
    const navigation = within(screen.getByRole('navigation', { name: 'Điều hướng chính' }));
    const logo = new URL(
      screen.getByRole('img', { name: 'Logo AgriAI' }).getAttribute('src') ?? '',
      window.location.href,
    );
    expect(logo.searchParams.get('url') ?? logo.pathname).toBe('/images/agriai-leaf-mark.png');
    expect(navigation.getByRole('link', { name: 'Cây trồng' })).toHaveAttribute('href', '/plants');
    expect(navigation.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
  it('announces the actual unread count and opens notifications', async () => {
    const onOpenNotifications = vi.fn();
    render(
      <Navbar
        currentTab="home"
        unreadNotificationsCount={3}
        onOpenNotifications={onOpenNotifications}
        userProfile={profile}
        isAuthenticated
        onOpenLogin={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Thông báo, 3 chưa đọc' }));
    expect(onOpenNotifications).toHaveBeenCalledOnce();
  });

  it('identifies the active page in the mobile menu and closes after navigation', async () => {
    render(
      <Navbar
        currentTab="plants"
        unreadNotificationsCount={0}
        onOpenNotifications={vi.fn()}
        userProfile={profile}
        isAuthenticated
        onOpenLogin={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mở menu' }));
    const menu = within(screen.getByRole('dialog'));
    expect(menu.getByRole('link', { name: 'Cây trồng' })).toHaveAttribute('aria-current', 'page');
    const historyLink = menu.getByRole('link', { name: 'Mẫu đã lưu' });
    expect(historyLink).toHaveAttribute('href', '/history');
    // jsdom cannot navigate documents; retain the real menu close interaction.
    historyLink.addEventListener('click', (event) => event.preventDefault(), { once: true });
    await userEvent.click(historyLink);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

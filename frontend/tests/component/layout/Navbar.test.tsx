import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Navbar } from '@/components/layout/Navbar';
import { getAppRoute } from '@/lib/appRoutes';

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
    expect(navigation.getByRole('link', { name: 'Hồ sơ nông nghiệp' })).toHaveAttribute(
      'href',
      '/agricultural-profiles',
    );
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

  it.each([
    { path: '/plants', label: 'Cây trồng' },
    { path: '/agricultural-profiles', label: 'Hồ sơ nông nghiệp' },
  ])(
    'identifies $path in both menus and closes the mobile menu after navigation',
    async ({ path, label }) => {
      render(
        <Navbar
          currentTab={getAppRoute(path).tab}
          unreadNotificationsCount={0}
          onOpenNotifications={vi.fn()}
          userProfile={profile}
          isAuthenticated
          onOpenLogin={vi.fn()}
        />,
      );
      const navigation = within(screen.getByRole('navigation', { name: 'Điều hướng chính' }));
      expect(navigation.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
      await userEvent.click(screen.getByRole('button', { name: 'Mở menu' }));
      const menu = within(screen.getByRole('dialog'));
      const destination = menu.getByRole('link', { name: label });
      expect(destination).toHaveAttribute('aria-current', 'page');
      expect(destination).toHaveAttribute('href', path);
      // jsdom cannot navigate documents; retain the real menu close interaction.
      destination.addEventListener('click', (event) => event.preventDefault(), { once: true });
      await userEvent.click(destination);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );
});

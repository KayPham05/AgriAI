import { render, screen, userEvent } from '@testing-library/react-native';

import { ShellTabBar, type ShellTabBarProps } from '@/components/ui/ShellTabBar';

function buildProps(activeIndex = 0) {
  const routes = [
    { key: 'home-key', name: 'home', params: undefined },
    { key: 'catalog-key', name: 'catalog', params: undefined },
    { key: 'diagnosis-key', name: 'diagnosis', params: undefined },
    { key: 'history-key', name: 'history', params: undefined },
    { key: 'account-key', name: 'account', params: undefined },
  ];
  const titles = ['Trang chủ', 'Tra cứu', 'Chẩn đoán', 'Lịch sử', 'Tài khoản'];
  const descriptors = Object.fromEntries(
    routes.map((route, i) => [route.key, { options: { title: titles[i] } }]),
  );
  const navigate = jest.fn();
  const emit = jest.fn(() => ({ defaultPrevented: false }));

  const props = {
    state: { index: activeIndex, routes },
    descriptors,
    navigation: { navigate, emit },
  } as unknown as ShellTabBarProps;

  return { props, navigate, emit };
}

describe('ShellTabBar', () => {
  it('renders all five tabs, marks the active tab selected, and navigates on press', async () => {
    const { props, navigate, emit } = buildProps(0);
    await render(<ShellTabBar {...props} />);

    expect(screen.getByRole('tab', { name: 'Trang chủ', selected: true })).toBeVisible();
    for (const label of ['Tra cứu', 'Chẩn đoán', 'Lịch sử', 'Tài khoản']) {
      expect(screen.getByRole('tab', { name: label, selected: false })).toBeVisible();
    }

    const user = userEvent.setup();
    await user.press(screen.getByRole('tab', { name: 'Trang chủ' }));
    expect(navigate).not.toHaveBeenCalled();

    await user.press(screen.getByRole('tab', { name: 'Tra cứu' }));
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'tabPress', target: 'catalog-key' }));
    expect(navigate).toHaveBeenCalledWith('catalog', undefined);
  });
});

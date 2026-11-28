import { render, screen, userEvent } from '@testing-library/react-native';

import { AccountScreen } from '@/features/account/screens/AccountScreen';
import { CatalogScreen } from '@/features/catalog/screens/CatalogScreen';
import { DiagnosisScreen } from '@/features/diagnosis/screens/DiagnosisScreen';
import { HistoryScreen } from '@/features/history/screens/HistoryScreen';

describe('App shell screens', () => {
  it('renders the four public catalog categories and hands selection to the navigation boundary', async () => {
    const onSelectCategory = jest.fn();
    await render(<CatalogScreen onSelectCategory={onSelectCategory} />);

    expect(screen.getByRole('header', { name: 'Tra cứu' })).toBeVisible();
    await userEvent.setup().press(screen.getByRole('button', { name: /Thuốc/ }));
    expect(onSelectCategory).toHaveBeenCalledWith('medicines');
  });

  it('disables diagnosis actions until camera/library handlers are supplied', async () => {
    await render(<DiagnosisScreen />);

    expect(screen.getByRole('header', { name: 'Chẩn đoán' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Chụp ảnh' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Chọn thư viện' })).toBeDisabled();
  });

  it('prompts guest users to sign in on History and shows an empty state when authenticated', async () => {
    const onLogin = jest.fn();
    const view = await render(<HistoryScreen onLogin={onLogin} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(onLogin).toHaveBeenCalledTimes(1);

    await view.rerender(<HistoryScreen isAuthenticated />);
    expect(screen.getByRole('header', { name: 'Chưa có lịch sử chẩn đoán' })).toBeVisible();
  });

  it('renders Account guest actions and keeps unimplemented rows disabled', async () => {
    const onLogin = jest.fn();
    await render(<AccountScreen onLogin={onLogin} />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Đăng ký' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cài đặt/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Trợ giúp/ })).toBeDisabled();
  });
});

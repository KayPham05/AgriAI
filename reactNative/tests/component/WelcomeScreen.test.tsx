import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { WelcomeScreen } from '@/features/onboarding/screens/WelcomeScreen';

describe('S02 welcome', () => {
  it.each([
    ['Chẩn đoán ngay', 'guest-diagnosis'],
    ['Đăng nhập', 'login'],
    ['Tra cứu', 'catalog'],
  ])('hands %s to the navigation boundary with the right intent', async (label, intent) => {
    const onNavigate = jest.fn();
    await render(<WelcomeScreen onNavigate={onNavigate} />);

    await userEvent.setup().press(screen.getByRole('button', { name: label }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(intent);
  });

  it('does not offer a dead route before navigation foundations are supplied', async () => {
    await render(<WelcomeScreen />);

    for (const label of ['Chẩn đoán ngay', 'Đăng nhập', 'Tra cứu']) {
      expect(screen.getByRole('button', { name: label })).toBeDisabled();
    }
    expect(screen.getByText('Chẩn đoán và tra cứu đang được chuẩn bị.')).toBeVisible();
  });

  it('keeps the introduction and actions usable when the leaf photo fails', async () => {
    const onNavigate = jest.fn();
    await render(<WelcomeScreen onNavigate={onNavigate} />);

    await fireEvent(screen.getByRole('image', { name: 'Bàn tay quan sát cây lúa trên cánh đồng' }), 'error');

    expect(screen.queryByRole('image', { name: 'Bàn tay quan sát cây lúa trên cánh đồng' })).toBeNull();
    expect(screen.getByRole('header', { name: /Quan sát chiếc lá/ })).toBeVisible();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Tra cứu' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('catalog');
  });

  it('opens and hands off navigation without starting a network request', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected API call'));
    try {
      await render(<WelcomeScreen onNavigate={jest.fn()} />);
      await userEvent.setup().press(screen.getByRole('button', { name: 'Chẩn đoán ngay' }));
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

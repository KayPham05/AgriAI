import { render, screen, userEvent } from '@testing-library/react-native';

import { HomeScreen } from '@/features/home/screens/HomeScreen';

describe('S10 home', () => {
  it('shows the diagnosis action and a saved result preview for a signed-in user', async () => {
    const onDiagnose = jest.fn();
    await render(<HomeScreen isAuthenticated onDiagnose={onDiagnose} />);

    expect(screen.getByRole('header', { name: 'Chào bạn' })).toBeVisible();
    expect(screen.getByText('Đốm nâu trên lá lúa')).toBeVisible();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Chụp ảnh lá' }));
    expect(onDiagnose).toHaveBeenCalledTimes(1);
  });

  it('shows the guest save prompt without inventing history data', async () => {
    await render(<HomeScreen isAuthenticated={false} onDiagnose={jest.fn()} />);

    expect(screen.getByText('Đăng nhập để xem và lưu các lần chẩn đoán.')).toBeVisible();
    expect(screen.queryByText('Đốm nâu trên lá lúa')).toBeNull();
  });
});

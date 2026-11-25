import { render, screen, userEvent } from '@testing-library/react-native';

import { LoginScreen } from '@/features/auth/screens/LoginScreen';

describe('S03 login mock', () => {
  it('accepts the mock credentials and reports a signed-in user', async () => {
    const onSuccess = jest.fn();
    await render(<LoginScreen onSuccess={onSuccess} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Email'), 'demo@agrivision.local');
    await user.type(screen.getByLabelText('Mật khẩu'), 'agrivision');
    await user.press(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(onSuccess).toHaveBeenCalledWith({ email: 'demo@agrivision.local', fullName: 'Minh Kha' });
  });

  it('keeps submit disabled until both fields have values', async () => {
    await render(<LoginScreen onSuccess={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeDisabled();
  });
});

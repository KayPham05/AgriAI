import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';

import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import type { LoginResult } from '@/features/auth/submitLogin';

afterEach(() => jest.restoreAllMocks());

it('animates the opening and the new fields when switching tabs', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  const timing = jest.spyOn(Animated, 'timing');
  await render(<LoginScreen onBack={jest.fn()} onSubmit={jest.fn()} onRegister={jest.fn()} />);
  expect(timing).toHaveBeenCalledTimes(1);
  await userEvent.setup().press(screen.getByRole('tab', { name: 'Đăng ký' }));
  expect(timing).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText('Họ và tên')).toBeVisible();
});

it('opens and switches forms immediately with Reduce Motion enabled', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const timing = jest.spyOn(Animated, 'timing');
  await render(<LoginScreen onBack={jest.fn()} onSubmit={jest.fn()} onRegister={jest.fn()} />);
  await userEvent.setup().press(screen.getByRole('tab', { name: 'Đăng ký' }));
  expect(screen.getByLabelText('Họ và tên')).toBeVisible();
  expect(timing).not.toHaveBeenCalled();
});

it('starts with a masked password and toggles its visibility', async () => {
  await render(<LoginScreen onBack={jest.fn()} onSubmit={jest.fn()} />);
  expect(screen.getByLabelText('Mật khẩu')).toHaveProp('secureTextEntry', true);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
  expect(screen.getByLabelText('Mật khẩu')).toHaveProp('secureTextEntry', false);
  expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toBeVisible();
});

it('locks duplicate submission, clears the password and hands 202 to the OTP owner', async () => {
  let finish: (result: LoginResult) => void = () => { throw new Error('Missing request'); };
  const onSubmit = jest.fn(() => new Promise<LoginResult>((resolve) => { finish = resolve; }));
  const onOtpRequired = jest.fn();
  const onAuthenticated = jest.fn();
  await render(<LoginScreen onBack={jest.fn()} {...{ onSubmit, onOtpRequired, onAuthenticated }} />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'an@example.test');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'typing');
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  const busy = screen.getByRole('button', { name: 'Đăng nhập', busy: true });
  expect(busy).toBeDisabled();
  await user.press(busy);
  expect(onSubmit).toHaveBeenCalledTimes(1);

  await act(() => finish({ kind: 'otp-required', challengeId: 'test-challenge' }));
  expect(onOtpRequired).toHaveBeenCalledWith('test-challenge');
  expect(onAuthenticated).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Mật khẩu')).toHaveProp('value', '');
});

it('shows the server error while keeping input available to edit', async () => {
  const onSubmit = jest.fn().mockResolvedValue({ kind: 'error', error: 'credentials' });
  await render(<LoginScreen onBack={jest.fn()} onSubmit={onSubmit} />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'an@example.test');
  await userEvent.setup().press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(screen.getByText(/Email hoặc mật khẩu không đúng/)).toBeVisible();
  expect(screen.getByLabelText('Email')).toHaveProp('value', 'an@example.test');
  expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
});

it('switches between forms and clears the previous password', async () => {
  await render(<LoginScreen onBack={jest.fn()} onSubmit={jest.fn()} onRegister={jest.fn()} />);
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'previous');
  const user = userEvent.setup();
  await user.press(screen.getByRole('tab', { name: 'Đăng ký' }));
  expect(screen.getByRole('tab', { name: 'Đăng ký', selected: true })).toBeVisible();
  expect(screen.getByLabelText('Họ và tên')).toBeVisible();
  expect(screen.getByLabelText('Mật khẩu')).toHaveProp('value', '');
  await user.press(screen.getByRole('tab', { name: 'Đăng nhập' }));
  expect(screen.queryByLabelText('Họ và tên')).toBeNull();
});

it('sends the registration form to its own handler', async () => {
  const onSubmit = jest.fn();
  const onRegister = jest.fn().mockResolvedValue({ kind: 'authenticated', userId: 'user-1', fullName: 'Mai Anh' });
  await render(<LoginScreen onBack={jest.fn()} {...{ onSubmit, onRegister }} />);
  const user = userEvent.setup();
  await user.press(screen.getByRole('tab', { name: 'Đăng ký' }));
  await fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'Mai Anh');
  await fireEvent.changeText(screen.getByLabelText('Email'), 'mai@example.test');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'fixture-password');
  await user.press(screen.getByRole('button', { name: 'Tạo tài khoản' }));
  expect(onRegister).toHaveBeenCalledWith({
    fullName: 'Mai Anh', email: 'mai@example.test', password: 'fixture-password',
  }, expect.anything());
  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByRole('header', { name: 'Đã tạo tài khoản' })).toBeVisible();
});

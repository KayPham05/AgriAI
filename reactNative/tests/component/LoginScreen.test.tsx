import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { AccessibilityInfo, Animated } from 'react-native';

import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import type { LoginResult } from '@/features/auth/submitLogin';
import { fillCaptcha } from './captchaInput';
import { readRegistrationTerms } from './readRegistrationTerms';

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
  await fillCaptcha();
  await user.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  const busy = screen.getByRole('button', { name: 'Đăng nhập', busy: true });
  expect(busy).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Tạo mã CAPTCHA mới' })).toBeDisabled();
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
  await fillCaptcha();
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
  await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu'), 'fixture-password');
  await readRegistrationTerms();
  await user.press(screen.getByRole('checkbox'));
  await user.press(screen.getByRole('button', { name: 'Tạo tài khoản' }));
  expect(onRegister).toHaveBeenCalledWith({
    fullName: 'Mai Anh', email: 'mai@example.test', password: 'fixture-password',
  }, expect.anything());
  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByRole('header', { name: 'Đã tạo tài khoản' })).toBeVisible();
});

it('opens the OTP field, sends the replacement challenge and only authenticates after verification', async () => {
  const authenticated = { kind: 'authenticated', userId: 'user-1', fullName: 'Mai Anh' } as const;
  const onSubmit = jest.fn().mockResolvedValue({ kind: 'otp-required', challengeId: 'original' });
  const onAuthenticated = jest.fn();
  const verify = jest.fn()
    .mockResolvedValueOnce({ kind: 'error', error: 'invalid-code' })
    .mockResolvedValueOnce(authenticated);
  const resend = jest.fn().mockResolvedValue({ kind: 'resent', challengeId: 'replacement' });
  await render(<LoginScreen onBack={jest.fn()} {...{ onSubmit, onAuthenticated }} otp={{ verify, resend }} />);
  const user = userEvent.setup();
  await fillCaptcha();
  await user.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  const input = screen.getByLabelText('Mã xác minh 8 số');
  expect(screen.queryByLabelText('Mật khẩu')).toBeNull();
  expect(onAuthenticated).not.toHaveBeenCalled();
  await fireEvent.changeText(input, '04 182 736');
  await user.press(screen.getByRole('button', { name: 'Xác minh mã' }));
  expect(verify).toHaveBeenLastCalledWith('original', '04182736', expect.anything());
  expect(screen.getByText('Mã không hợp lệ hoặc đã hết hạn.')).toBeVisible();
  await user.press(screen.getByRole('button', { name: 'Gửi lại mã' }));
  expect(resend).toHaveBeenCalledWith('original', expect.anything());
  expect(screen.getByLabelText('Mã xác minh 8 số')).toHaveProp('value', '');
  await fireEvent.changeText(screen.getByLabelText('Mã xác minh 8 số'), '80291367');
  await user.press(screen.getByRole('button', { name: 'Xác minh mã' }));
  expect(verify).toHaveBeenLastCalledWith('replacement', '80291367', expect.anything());
  expect(onAuthenticated).toHaveBeenCalledWith(authenticated);
});

it('returns from OTP to password entry without keeping the previous password', async () => {
  const onBack = jest.fn();
  const onSubmit = jest.fn().mockResolvedValue({ kind: 'otp-required', challengeId: 'original' });
  await render(<LoginScreen {...{ onSubmit, onBack }} otp={{ verify: jest.fn(), resend: jest.fn() }} />);
  const user = userEvent.setup();
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'fixture-password');
  await fillCaptcha();
  await user.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(screen.getByLabelText('Mã xác minh 8 số')).toBeVisible();
  await user.press(screen.getByRole('button', { name: 'Quay lại' }));
  expect(screen.getByLabelText('Mật khẩu')).toHaveProp('value', '');
  expect(onBack).not.toHaveBeenCalled();
});

it('locks resend during verification and ignores a response after leaving OTP', async () => {
  let finish!: (result: { kind: 'authenticated'; userId: string; fullName: string }) => void;
  const onSubmit = jest.fn().mockResolvedValue({ kind: 'otp-required', challengeId: 'original' });
  const onAuthenticated = jest.fn();
  const verify = jest.fn(() => new Promise<Parameters<typeof finish>[0]>((resolve) => { finish = resolve; }));
  const resend = jest.fn();
  await render(<LoginScreen onBack={jest.fn()} {...{ onSubmit, onAuthenticated }} otp={{ verify, resend }} />);
  const user = userEvent.setup();
  await fillCaptcha();
  await user.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(screen.getByRole('button', { name: 'Xác minh mã' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Mã xác minh 8 số'), '04182736');
  await user.press(screen.getByRole('button', { name: 'Xác minh mã' }));
  const resendButton = screen.getByRole('button', { name: 'Gửi lại mã' });
  expect(resendButton).toBeDisabled();
  await user.press(resendButton);
  expect(resend).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: 'Quay lại' }));
  await act(() => finish({ kind: 'authenticated', userId: 'fixture', fullName: 'Mai Anh' }));
  expect(onAuthenticated).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Mật khẩu')).toBeVisible();
});

it('blocks login until the displayed CAPTCHA is entered and omits it from credentials', async () => {
  const onSubmit = jest.fn().mockResolvedValue({ kind: 'error', error: 'credentials' });
  await render(<LoginScreen onBack={jest.fn()} onSubmit={onSubmit} />);
  const user = userEvent.setup();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'mai@example.test');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'fixture-password');
  await user.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByText('Mã CAPTCHA chưa chính xác.')).toBeVisible();
  const label: string = screen.getByLabelText(/^Mã CAPTCHA: /).props.accessibilityLabel;
  await fireEvent.changeText(screen.getByLabelText('Mã xác nhận'), label.slice('Mã CAPTCHA: '.length).toLowerCase());
  await user.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(onSubmit).toHaveBeenCalledWith({ email: 'mai@example.test', password: 'fixture-password' }, expect.anything());
  expect(screen.getByLabelText('Mã xác nhận')).toHaveProp('value', '');
});

it('refreshes the CAPTCHA and excludes it from registration', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.1);
  await render(<LoginScreen onBack={jest.fn()} onSubmit={jest.fn()} onRegister={jest.fn()} />);
  const oldLabel: string = screen.getByLabelText(/^Mã CAPTCHA: /).props.accessibilityLabel;
  await fillCaptcha();
  jest.mocked(Math.random).mockReturnValue(0.8);
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: 'Tạo mã CAPTCHA mới' }));
  expect(screen.getByLabelText(/^Mã CAPTCHA: /).props.accessibilityLabel).not.toBe(oldLabel);
  expect(screen.getByLabelText('Mã xác nhận')).toHaveProp('value', '');
  await user.press(screen.getByRole('tab', { name: 'Đăng ký' }));
  expect(screen.queryByLabelText('Mã xác nhận')).toBeNull();
});


it('shows the server lock duration and allows editing to use another account', async () => {
  const onSubmit = jest.fn().mockResolvedValue({ kind: 'error', error: 'login-locked', retryAfterSeconds: 600 });
  await render(<LoginScreen onBack={jest.fn()} onSubmit={onSubmit} />);
  await fillCaptcha();
  await userEvent.setup().press(screen.getByRole('button', { name: '\u0110\u0103ng nh\u1eadp' }));
  expect(screen.getByText(/10 ph\u00fat/)).toBeVisible();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'other@example.test');
  expect(screen.getByLabelText('Email')).toHaveProp('value', 'other@example.test');
  expect(screen.getByRole('button', { name: '\u0110\u0103ng nh\u1eadp' })).toBeEnabled();
});


it('blocks registration until confirmation matches exactly and terms are checked', async () => {
  const onRegister = jest.fn().mockResolvedValue({ kind: 'error', error: 'registration-rejected' });
  await render(<LoginScreen onBack={jest.fn()} onSubmit={jest.fn()} onRegister={onRegister} />);
  const user = userEvent.setup();
  await user.press(screen.getByRole('tab', { name: '\u0110\u0103ng k\u00fd' }));
  expect(screen.getByRole('checkbox', { checked: false })).toBeVisible();
  await fireEvent.changeText(screen.getByLabelText('M\u1eadt kh\u1ea9u'), 'password ');
  const submit = () => user.press(screen.getByRole('button', { name: 'T\u1ea1o t\u00e0i kho\u1ea3n' }));
  await submit();
  expect(screen.getByText('Vui l\u00f2ng nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u.')).toBeVisible();
  expect(onRegister).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u'), 'password');
  await readRegistrationTerms();
  await user.press(screen.getByRole('checkbox'));
  await submit();
  expect(screen.getByText('M\u1eadt kh\u1ea9u nh\u1eadp l\u1ea1i kh\u00f4ng kh\u1edbp.')).toBeVisible();
  expect(onRegister).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u'), 'password ');
  await user.press(screen.getByRole('checkbox'));
  await submit();
  expect(screen.getByText('B\u1ea1n c\u1ea7n \u0111\u1ed3ng \u00fd v\u1edbi \u0111i\u1ec1u kho\u1ea3n \u0111\u1ec3 t\u1ea1o t\u00e0i kho\u1ea3n.')).toBeVisible();
  expect(onRegister).not.toHaveBeenCalled();
  await user.press(screen.getByRole('checkbox'));
  await submit();
  expect(onRegister).toHaveBeenCalledTimes(1);
  expect(onRegister.mock.calls[0][0]).toEqual({ fullName: '', email: '', password: 'password ' });
});

it('opens terms without checking consent and resets registration-only values on mode changes', async () => {
  await render(<LoginScreen onBack={jest.fn()} onSubmit={jest.fn()} onRegister={jest.fn()} />);
  const user = userEvent.setup();
  await user.press(screen.getByRole('tab', { name: '\u0110\u0103ng k\u00fd' }));
  await readRegistrationTerms();
  expect(screen.getByRole('checkbox', { checked: false })).toBeVisible();
  expect(screen.getByLabelText('Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u')).toHaveProp('secureTextEntry', true);
  await user.press(screen.getByRole('button', { name: 'Hi\u1ec7n m\u1eadt kh\u1ea9u nh\u1eadp l\u1ea1i' }));
  expect(screen.getByLabelText('Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u')).toHaveProp('secureTextEntry', false);
  expect(screen.getByLabelText('M\u1eadt kh\u1ea9u')).toHaveProp('secureTextEntry', true);
  await fireEvent.changeText(screen.getByLabelText('Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u'), 'sensitive');
  await user.press(screen.getByRole('checkbox'));
  await user.press(screen.getByRole('tab', { name: '\u0110\u0103ng nh\u1eadp' }));
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByLabelText('Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u')).toBeNull();
  await user.press(screen.getByRole('tab', { name: '\u0110\u0103ng k\u00fd' }));
  expect(screen.getByRole('checkbox', { checked: false })).toBeVisible();
  expect(screen.getByLabelText('Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u')).toHaveProp('value', '');
  expect(screen.getByLabelText('Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u')).toHaveProp('secureTextEntry', true);
});


it('disables confirmation and consent while a registration request is pending', async () => {
  let finish!: (result: LoginResult) => void;
  const onRegister = jest.fn(() => new Promise<LoginResult>(resolve => { finish = resolve; }));
  await render(<LoginScreen onBack={jest.fn()} onSubmit={jest.fn()} onRegister={onRegister} />);
  const user = userEvent.setup();
  await user.press(screen.getByRole('tab', { name: '\u0110\u0103ng k\u00fd' }));
  await fireEvent.changeText(screen.getByLabelText('M\u1eadt kh\u1ea9u'), 'password');
  await fireEvent.changeText(screen.getByLabelText('Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u'), 'password');
  await readRegistrationTerms();
  await user.press(screen.getByRole('checkbox'));
  await user.press(screen.getByRole('button', { name: 'T\u1ea1o t\u00e0i kho\u1ea3n' }));
  expect(screen.getByRole('checkbox', { checked: true })).toBeDisabled();
  expect(screen.getByLabelText('Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u')).toHaveProp('editable', false);
  expect(screen.getByRole('button', { name: 'Hi\u1ec7n m\u1eadt kh\u1ea9u nh\u1eadp l\u1ea1i' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'T\u1ea1o t\u00e0i kho\u1ea3n' }));
  expect(onRegister).toHaveBeenCalledTimes(1);
  await act(() => finish({ kind: 'error', error: 'registration-rejected' }));
  expect(screen.getByRole('checkbox', { checked: true })).not.toBeDisabled();
});


it('does not register after merely opening terms or reaching the end without consent', async () => {
  const onRegister = jest.fn().mockResolvedValue({ kind: 'error', error: 'registration-rejected' });
  await render(<LoginScreen onBack={jest.fn()} onSubmit={jest.fn()} onRegister={onRegister} />);
  const user = userEvent.setup();
  await user.press(screen.getByRole('tab', { name: '\u0110\u0103ng k\u00fd' }));
  await fireEvent.changeText(screen.getByLabelText('M\u1eadt kh\u1ea9u'), 'password');
  await fireEvent.changeText(screen.getByLabelText('Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u'), 'password');
  expect(screen.getByRole('checkbox')).toBeDisabled();
  await user.press(screen.getByRole('button', { name: '\u0110i\u1ec1u kho\u1ea3n s\u1eed d\u1ee5ng AgriAI' }));
  await user.press(screen.getByRole('button', { name: '\u0110\u00f3ng \u0111i\u1ec1u kho\u1ea3n' }));
  expect(screen.getByRole('checkbox')).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'T\u1ea1o t\u00e0i kho\u1ea3n' }));
  expect(onRegister).not.toHaveBeenCalled();
  await readRegistrationTerms();
  await user.press(screen.getByRole('button', { name: 'T\u1ea1o t\u00e0i kho\u1ea3n' }));
  expect(onRegister).not.toHaveBeenCalled();
  await user.press(screen.getByRole('checkbox'));
  await user.press(screen.getByRole('button', { name: 'T\u1ea1o t\u00e0i kho\u1ea3n' }));
  expect(onRegister).toHaveBeenCalledTimes(1);
});


it('shows field validation from the adapter and clears only the edited field error', async () => {
  const onSubmit = jest.fn().mockResolvedValue({ kind: 'invalid', fields: { email: 'format', password: 'required' } });
  await render(<LoginScreen onBack={jest.fn()} onSubmit={onSubmit} />);
  await fillCaptcha();
  await userEvent.setup().press(screen.getByRole('button', { name: '\u0110\u0103ng nh\u1eadp' }));
  expect(screen.getByText('Nh\u1eadp \u0111\u1ecba ch\u1ec9 email h\u1ee3p l\u1ec7.')).toBeVisible();
  expect(screen.getByText('Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u.')).toBeVisible();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'valid@example.test');
  expect(screen.queryByText('Nh\u1eadp \u0111\u1ecba ch\u1ec9 email h\u1ee3p l\u1ec7.')).toBeNull();
  expect(screen.getByText('Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u.')).toBeVisible();
  await fireEvent.changeText(screen.getByLabelText('M\u1eadt kh\u1ea9u'), 'password');
  expect(screen.queryByText('Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u.')).toBeNull();
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

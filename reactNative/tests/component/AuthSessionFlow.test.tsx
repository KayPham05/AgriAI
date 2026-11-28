import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { fetch } from 'expo/fetch';
import { getItemAsync, setItemAsync } from 'expo-secure-store';

import HomeRoute from '@/app/home';
import LoginRoute from '@/app/login';
import { StartupSessionProvider, useStartupSession } from '@/features/auth/StartupSession';
import { sessionTokenKey } from '@/lib/storage/sessionToken';
import { fillCaptcha } from './captchaInput';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ canGoBack: () => false, replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

function AuthFlow() {
  const { session } = useStartupSession();
  if (session.status === 'guest') return <LoginRoute />;
  return <HomeRoute />;
}

const testProfile = { id: 'sample-user', fullName: 'Mai Anh', role: 'User' };

it('enters Home after persisting login and restores the same profile on a fresh provider', async () => {
  const originalOrigin = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
  let savedToken: string | null = null;
  jest.mocked(getItemAsync).mockImplementation(async () => savedToken);
  jest.mocked(setItemAsync).mockImplementation(async (key, token) => {
    expect(key).toBe(sessionTokenKey);
    savedToken = token;
  });
  const request = jest.mocked(fetch);
  const user = userEvent.setup();
  request.mockResolvedValueOnce({
    status: 200, json: async () => ({ token: 'fixture-session', user: testProfile }),
  } as Awaited<ReturnType<typeof fetch>>);
  try {
    const first = await render(<StartupSessionProvider><AuthFlow /></StartupSessionProvider>);
    await fireEvent.changeText(await screen.findByLabelText('Email'), 'mai@example.test');
    await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'fixture-password');
    await fillCaptcha();
    await user.press(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByRole('header', { name: 'Trang chủ' })).toBeVisible();
    expect(screen.getByText('Chào Mai Anh')).toBeVisible();
    expect(savedToken).toBe('fixture-session');
    expect(request).toHaveBeenCalledTimes(1);
    await first.unmount();

    request.mockResolvedValueOnce({
      status: 200, json: async () => testProfile,
    } as Awaited<ReturnType<typeof fetch>>);
    await render(<StartupSessionProvider><AuthFlow /></StartupSessionProvider>);
    expect(await screen.findByRole('header', { name: 'Trang chủ' })).toBeVisible();
    expect(request).toHaveBeenLastCalledWith('https://api.example.test/api/auth/me', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer fixture-session' }),
    }));
  } finally {
    if (originalOrigin === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalOrigin;
  }
});


it('requests password recovery through the real route adapter without creating a session', async () => {
  const originalOrigin = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
  jest.mocked(getItemAsync).mockResolvedValue(null);
  const request = jest.mocked(fetch);
  request.mockResolvedValueOnce({status:202} as Awaited<ReturnType<typeof fetch>>);
  try {
    await render(<StartupSessionProvider><AuthFlow /></StartupSessionProvider>);
    await fireEvent.changeText(await screen.findByLabelText('Email'),'User@Example.test');
    const user = userEvent.setup();
    await user.press(screen.getByRole('button',{name:'Qu\u00ean m\u1eadt kh\u1ea9u'}));
    await user.press(screen.getByRole('button',{name:'G\u1eedi m\u00e3'}));
    expect(screen.getByRole('header',{name:'Ki\u1ec3m tra email'})).toBeVisible();
    expect(screen.queryByRole('header',{name:'Trang ch\u1ee7'})).toBeNull();
    expect(setItemAsync).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith('https://api.example.test/api/auth/forgot-password',expect.objectContaining({
      method:'POST',body:JSON.stringify({email:'user@example.test'}),credentials:'omit',
    }));
    request.mockResolvedValueOnce({status:204} as Awaited<ReturnType<typeof fetch>>);
    await fireEvent.changeText(screen.getByLabelText('Mã đặt lại mật khẩu'),'12345678');
    await user.press(screen.getByRole('button',{name:'Xác minh mã'}));
    expect(request).toHaveBeenLastCalledWith('https://api.example.test/api/auth/reset-password/verify',expect.objectContaining({
      body:JSON.stringify({code:'12345678'}),
    }));
    await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'),'NewPassword123');
    await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu mới'),'NewPassword123');
    request.mockResolvedValueOnce({status:204} as Awaited<ReturnType<typeof fetch>>);
    await user.press(screen.getByRole('button',{name:'Đổi mật khẩu'}));
    expect(request).toHaveBeenLastCalledWith('https://api.example.test/api/auth/reset-password',expect.objectContaining({
      body:JSON.stringify({code:'12345678',password:'NewPassword123'}),
    }));
    expect(screen.getByRole('header',{name:'Đổi mật khẩu thành công'})).toBeVisible();
    expect(setItemAsync).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button',{name:'Quay lại đăng nhập'}));
    expect(screen.getByRole('button',{name:'Đăng nhập'})).toBeVisible();
  } finally {
    if(originalOrigin===undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL=originalOrigin;
  }
});

import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { fetch } from 'expo/fetch';
import { getItemAsync, setItemAsync } from 'expo-secure-store';

import HomeRoute from '@/app/home';
import LoginRoute from '@/app/login';
import { StartupSessionProvider, useStartupSession } from '@/features/auth/StartupSession';
import { sessionTokenKey } from '@/lib/storage/sessionToken';
import { fillCaptcha } from './captchaInput';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ canGoBack: () => false, replace: jest.fn() }) }));
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

import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import type { PasswordResetRequestResult } from '@/features/auth/submitLogin';

afterEach(() => jest.restoreAllMocks());

it('keeps email and retry available after validation or network failure', async () => {
  const onRequestReset=jest.fn().mockResolvedValueOnce({kind:'invalid',fields:{email:'format'}}).mockResolvedValueOnce({kind:'error',error:'network'});
  await render(<ForgotPasswordScreen onBack={jest.fn()} onRequestReset={onRequestReset} initialEmail="wrong" />);
  const user=userEvent.setup();
  expect(screen.queryByRole('alert')).toBeNull();
  await user.press(screen.getByRole('button',{name:'G\u1eedi m\u00e3'}));
  expect(screen.getByRole('alert')).toHaveTextContent('Nh\u1eadp \u0111\u1ecba ch\u1ec9 email h\u1ee3p l\u1ec7.');
  await fireEvent.changeText(screen.getByLabelText('Email'),'user@example.test');
  expect(screen.queryByRole('alert')).toBeNull();
  await user.press(screen.getByRole('button',{name:'G\u1eedi m\u00e3'}));
  expect(screen.getByRole('alert')).toHaveTextContent(/Ki\u1ec3m tra m\u1ea1ng/);
  expect(screen.getByLabelText('Email')).toHaveProp('value','user@example.test');
  expect(screen.getByRole('button',{name:'G\u1eedi m\u00e3'})).not.toBeDisabled();
});

it('locks repeat requests and shows a neutral acknowledgement only after 202', async () => {
  let finish!: (result:PasswordResetRequestResult)=>void;
  const onRequestReset=jest.fn((_email: string, _signal: AbortSignal)=>new Promise<PasswordResetRequestResult>(resolve=>{finish=resolve;}));
  await render(<ForgotPasswordScreen onBack={jest.fn()} onRequestReset={onRequestReset} />);
  const user=userEvent.setup();
  await fireEvent.changeText(screen.getByLabelText('Email'),'user@example.test');
  await user.press(screen.getByRole('button',{name:'G\u1eedi m\u00e3'}));
  expect(screen.getByRole('button',{name:'G\u1eedi m\u00e3'})).toBeDisabled();
  expect(screen.getByLabelText('Email')).toHaveProp('editable',false);
  await user.press(screen.getByRole('button',{name:'G\u1eedi m\u00e3'}));
  expect(onRequestReset).toHaveBeenCalledTimes(1);
  await act(()=>finish({kind:'accepted',email:'user@example.test'}));
  expect(screen.getByRole('header',{name:'Ki\u1ec3m tra email'})).toBeVisible();
  expect(screen.getByText(/N\u1ebfu email kh\u1edbp/)).toBeVisible();
  expect(screen.queryByLabelText('M\u00e3 x\u00e1c minh 8 s\u1ed1')).toBeNull();
  await user.press(screen.getByRole('button',{name:'Thay \u0111\u1ed5i email'}));
  expect(screen.getByLabelText('Email')).toHaveProp('value','user@example.test');
});

it('hardware Back cancels an in-flight request and ignores its late response', async () => {
  const subscription=jest.spyOn(BackHandler,'addEventListener');
  const onBack=jest.fn();
  let finish!: (result:PasswordResetRequestResult)=>void;
  const onRequestReset=jest.fn((_email: string, _signal: AbortSignal)=>new Promise<PasswordResetRequestResult>(resolve=>{finish=resolve;}));
  await render(<ForgotPasswordScreen {...{onBack,onRequestReset}} />);
  await userEvent.setup().press(screen.getByRole('button',{name:'G\u1eedi m\u00e3'}));
  const signal=onRequestReset.mock.calls[0][1];
  const handler=subscription.mock.calls.find(c=>c[0]==='hardwareBackPress')![1];
  await act(()=>{expect(handler({type:'hardwareBackPress',timeStamp:0})).toBe(true);});
  expect(signal.aborted).toBe(true);
  expect(onBack).toHaveBeenCalledTimes(1);
  await act(()=>finish({kind:'accepted',email:'user@example.test'}));
  expect(screen.queryByRole('header',{name:'Ki\u1ec3m tra email'})).toBeNull();
});

it('offers retry after a thrown request error and the back button returns to login', async () => {
  const onBack=jest.fn();
  await render(<ForgotPasswordScreen onBack={onBack} onRequestReset={jest.fn().mockRejectedValue(new Error('offline'))} />);
  const user=userEvent.setup();
  await user.press(screen.getByRole('button',{name:'G\u1eedi m\u00e3'}));
  expect(screen.getByText(/Ch\u01b0a th\u1ec3/)).toBeVisible();
  await user.press(screen.getByRole('button',{name:'Quay l\u1ea1i \u0111\u0103ng nh\u1eadp'}));
  expect(onBack).toHaveBeenCalledTimes(1);
});

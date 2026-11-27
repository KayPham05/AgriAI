import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { RegistrationConsent } from '@/features/auth/screens/RegistrationConsent';

const termsName = '\u0110i\u1ec1u kho\u1ea3n s\u1eed d\u1ee5ng AgriAI';
const contentName = 'N\u1ed9i dung \u0111i\u1ec1u kho\u1ea3n s\u1eed d\u1ee5ng AgriAI';
const closeName = '\u0110\u00f3ng \u0111i\u1ec1u kho\u1ea3n';

it('requires opening and reaching the end before consent can change', async () => {
  const onChange = jest.fn();
  await render(<RegistrationConsent checked={false} disabled={false} onReadComplete={jest.fn()} onChange={onChange} />);
  const user = userEvent.setup();
  expect(screen.getByRole('checkbox')).toBeDisabled();
  await user.press(screen.getByRole('checkbox'));
  expect(onChange).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: termsName }));
  const content = screen.getByLabelText(contentName);
  await fireEvent.scroll(content, { nativeEvent: { contentOffset: { y: 0 }, contentSize: { height: 1200 }, layoutMeasurement: { height: 400 } } });
  await user.press(screen.getByRole('button', { name: closeName }));
  expect(screen.getByRole('checkbox')).toBeDisabled();
  await user.press(screen.getByRole('button', { name: termsName }));
  await fireEvent.scroll(screen.getByLabelText(contentName), {
    nativeEvent: { contentOffset: { y: 800 }, contentSize: { height: 1200 }, layoutMeasurement: { height: 400 } },
  });
  await user.press(screen.getByRole('button', { name: closeName }));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('checkbox', { checked: false })).not.toBeDisabled();
  await user.press(screen.getByRole('checkbox'));
  expect(onChange).toHaveBeenCalledWith(true);
});

it('unlocks when all terms fit in the measured viewport without scrolling', async () => {
  await render(<RegistrationConsent checked={false} disabled={false} onReadComplete={jest.fn()} onChange={jest.fn()} />);
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: termsName }));
  const content = screen.getByLabelText(contentName);
  await fireEvent(content, 'layout', { nativeEvent: { layout: { width: 320, height: 600, x: 0, y: 0 } } });
  await fireEvent(content, 'contentSizeChange', 320, 500);
  await user.press(screen.getByRole('button', { name: closeName }));
  expect(screen.getByRole('checkbox')).not.toBeDisabled();
});

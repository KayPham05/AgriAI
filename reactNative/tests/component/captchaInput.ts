import { fireEvent, screen } from '@testing-library/react-native';

export async function fillCaptcha() {
  const label: string = screen.getByLabelText(/^Mã CAPTCHA: /).props.accessibilityLabel;
  const code = label.slice('Mã CAPTCHA: '.length);
  await fireEvent.changeText(screen.getByLabelText('Mã xác nhận'), code);
}

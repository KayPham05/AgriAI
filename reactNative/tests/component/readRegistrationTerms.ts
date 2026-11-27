import { fireEvent, screen, userEvent } from '@testing-library/react-native';

// Native layout/scroll events are supplied explicitly because component tests have no layout engine.
export async function readRegistrationTerms() {
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: '\u0110i\u1ec1u kho\u1ea3n s\u1eed d\u1ee5ng AgriAI' }));
  await fireEvent.scroll(screen.getByLabelText('N\u1ed9i dung \u0111i\u1ec1u kho\u1ea3n s\u1eed d\u1ee5ng AgriAI'), {
    nativeEvent: { contentOffset: { x: 0, y: 800 }, contentSize: { width: 320, height: 1200 }, layoutMeasurement: { width: 320, height: 400 } },
  });
  await user.press(screen.getByRole('button', { name: '\u0110\u00f3ng \u0111i\u1ec1u kho\u1ea3n' }));
}

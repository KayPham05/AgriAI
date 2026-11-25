import { render, screen, userEvent } from '@testing-library/react-native';

import { StartupStatus } from '@/features/auth/screens/StartupStatus';

it('keeps retry visible and prevents another press while the session is being checked', async () => {
  const retry = jest.fn();
  const user = userEvent.setup();
  const view = await render(<StartupStatus kind="timeout" onRetry={retry} />);

  await user.press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(retry).toHaveBeenCalledTimes(1);

  await view.rerender(<StartupStatus kind="loading" onRetry={retry} />);
  const pendingRetry = screen.getByRole('button', { name: 'Thử lại', busy: true });
  expect(pendingRetry).toBeDisabled();
  await user.press(pendingRetry);
  expect(retry).toHaveBeenCalledTimes(1);
});

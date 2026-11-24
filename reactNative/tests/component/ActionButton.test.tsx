import { render, screen, userEvent } from '@testing-library/react-native';

import { ActionButton } from '@/components/ui/ActionButton';

describe('ActionButton navigation availability', () => {
  it.each(['primary', 'secondary'] as const)(
    'enables %s only while a navigation handler is available',
    async (variant) => {
      const onPress = jest.fn();
      const user = userEvent.setup();
      const view = await render(<ActionButton label="Tiếp tục" variant={variant} />);

      expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
      await user.press(screen.getByRole('button', { name: 'Tiếp tục' }));

      await view.rerender(<ActionButton label="Tiếp tục" variant={variant} onPress={onPress} />);
      expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeEnabled();
      expect(onPress).not.toHaveBeenCalled();
      await user.press(screen.getByRole('button', { name: 'Tiếp tục' }));
      expect(onPress).toHaveBeenCalledTimes(1);

      await view.rerender(<ActionButton label="Tiếp tục" variant={variant} />);
      expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
      await user.press(screen.getByRole('button', { name: 'Tiếp tục' }));
      expect(onPress).toHaveBeenCalledTimes(1);
    },
  );
});

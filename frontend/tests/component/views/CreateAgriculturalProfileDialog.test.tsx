import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateAgriculturalProfileDialog } from '@/components/agricultural-profile/CreateAgriculturalProfileDialog';

function Harness() {
  const [open, setOpen] = useState(true);
  return open ? (
    <CreateAgriculturalProfileDialog
      ownerName="Người trồng"
      onCreate={vi.fn()}
      onCreated={vi.fn()}
      onClose={() => setOpen(false)}
    />
  ) : (
    <p>Đã đóng biểu mẫu</p>
  );
}

describe('profile dialog draft protection', () => {
  it.each(['Escape', 'close button', 'outside', 'cancel'])(
    'confirms dismissal through %s and preserves the draft when declined',
    async (action) => {
      render(<Harness />);
      const user = userEvent.setup();
      await user.type(screen.getByRole('textbox', { name: 'Tên hồ sơ *' }), 'Vườn chưa lưu');
      await user.type(
        screen.getByRole('textbox', { name: 'Mô tả và thông tin canh tác' }),
        'Ghi chú chưa lưu',
      );
      if (action === 'Escape') await user.keyboard('{Escape}');
      else if (action === 'outside') {
        // jsdom has no backdrop hit testing or PointerEvent implementation.
        fireEvent(document.body, new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
        fireEvent.click(document.body);
      } else
        await user.click(
          screen.getByRole('button', { name: action === 'cancel' ? 'Hủy' : 'Đóng' }),
        );

      const confirmation = await screen.findByRole('alertdialog', { name: 'Bỏ thay đổi?' });
      await user.click(within(confirmation).getByRole('button', { name: 'Ở lại' }));
      expect(screen.getByRole('textbox', { name: 'Tên hồ sơ *' })).toHaveValue('Vườn chưa lưu');
      expect(screen.getByRole('textbox', { name: 'Mô tả và thông tin canh tác' })).toHaveValue(
        'Ghi chú chưa lưu',
      );
      await user.click(screen.getByRole('button', { name: 'Đóng' }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bỏ thay đổi' }),
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByText('Đã đóng biểu mẫu')).toBeVisible();
    },
  );

  it('closes an untouched form without a discard prompt', async () => {
    render(<Harness />);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('Đã đóng biểu mẫu')).toBeVisible();
  });
});

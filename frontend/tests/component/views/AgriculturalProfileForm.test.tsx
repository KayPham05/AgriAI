import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AgriculturalProfileForm } from '@/components/agricultural-profile/AgriculturalProfileForm';

describe('AgriculturalProfileForm', () => {
  it('requires a non-empty trimmed name before submitting', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <AgriculturalProfileForm
        ownerName="Nguyễn Minh An"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Tên hồ sơ *' }), '   ');
    await user.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập tên hồ sơ.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('trims and normalizes the description before submitting', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <AgriculturalProfileForm
        ownerName="Nguyễn Minh An"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Tên hồ sơ *' }), '  Vườn nhà  ');
    await user.type(
      screen.getByRole('textbox', { name: 'Mô tả và thông tin canh tác' }),
      '  Đất phù sa  ',
    );
    await user.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      name: 'Vườn nhà',
      description: 'Đất phù sa',
    });
  });
});

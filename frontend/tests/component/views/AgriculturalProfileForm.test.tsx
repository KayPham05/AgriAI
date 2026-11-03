import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AgriculturalProfileForm } from '@/components/agricultural-profile/AgriculturalProfileForm';

describe('AgriculturalProfileForm', () => {
  it('shows an inline error for an empty name', async () => {
    const onSubmit = vi.fn();
    render(
      <AgriculturalProfileForm
        ownerName="Người trồng"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập tên hồ sơ.');
    expect(screen.getByRole('textbox', { name: 'Tên hồ sơ *' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it('keeps unsaved input when cancellation is declined', async () => {
    const onCancel = vi.fn();
    render(
      <AgriculturalProfileForm
        ownerName="Người trồng"
        isSubmitting={false}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Tên hồ sơ *' }), 'Vườn mới');
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ở lại' }));
    expect(screen.getByRole('textbox', { name: 'Tên hồ sơ *' })).toHaveValue('Vườn mới');
    expect(onCancel).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    await user.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
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

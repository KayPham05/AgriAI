import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminActionDialog } from './AdminActionDialog';

function setup(onConfirm = vi.fn<(message: string) => Promise<void>>().mockResolvedValue()) {
  const onClose = vi.fn();
  render(
    <AdminActionDialog
      title="Khóa tài khoản"
      description="Thao tác minh họa"
      confirmText="Xác nhận khóa"
      messageLabel="Lý do"
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
  return { user: userEvent.setup(), onConfirm, onClose };
}

describe('Admin action confirmation', () => {
  it('rejects whitespace-only reasons without performing the action', async () => {
    const { user, onConfirm, onClose } = setup();
    await user.type(screen.getByRole('textbox'), '   ');
    await user.click(screen.getByRole('button', { name: 'Xác nhận khóa' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập nội dung.');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('trims the reason and closes only after confirmation resolves', async () => {
    let finish: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const { user, onConfirm, onClose } = setup(vi.fn(() => pending));
    await user.type(screen.getByRole('textbox'), '  Kiểm tra  ');
    await user.click(screen.getByRole('button', { name: 'Xác nhận khóa' }));
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('Kiểm tra');
    expect(screen.getByRole('button', { name: 'Đang xử lý...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled();
    expect(screen.getByRole('textbox')).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => finish());
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('keeps the dialog open after failure and allows retry', async () => {
    const confirm = vi
      .fn<(message: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('Không thể hoàn tất'))
      .mockResolvedValueOnce();
    const { user, onClose } = setup(confirm);
    await user.type(screen.getByRole('textbox'), 'Kiểm tra');
    await user.click(screen.getByRole('button', { name: 'Xác nhận khóa' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể hoàn tất');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('Kiểm tra');
    await user.click(screen.getByRole('button', { name: 'Xác nhận khóa' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('cancels without submitting the action', async () => {
    const { user, onConfirm, onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms an action that does not require a reason', async () => {
    const onConfirm = vi.fn<(message: string) => Promise<void>>().mockResolvedValue();
    const onClose = vi.fn();
    render(
      <AdminActionDialog
        title="Xóa ảnh"
        description="Ảnh mẫu"
        confirmText="Xóa"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    expect(screen.queryByRole('textbox')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^Xóa$/ }));
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows a fallback error for a non-Error rejection', async () => {
    const { user, onClose } = setup(vi.fn().mockRejectedValue(null));
    await user.type(screen.getByRole('textbox'), 'Kiểm tra');
    await user.click(screen.getByRole('button', { name: 'Xác nhận khóa' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Thao tác chưa hoàn tất.');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Xác nhận khóa' })).toBeEnabled();
  });

  it('allows Escape to cancel before submission', async () => {
    const { user, onClose, onConfirm } = setup();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('limits the entered reason to the configured length', async () => {
    const onConfirm = vi.fn<(message: string) => Promise<void>>().mockResolvedValue();
    render(
      <AdminActionDialog
        title="Cảnh báo"
        description="Tài khoản mẫu"
        confirmText="Gửi"
        messageLabel="Nội dung"
        maxLength={5}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByRole('textbox'), 'abcdefgh');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('abcde');
  });
});

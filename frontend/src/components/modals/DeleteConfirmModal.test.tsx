import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeleteConfirmModal } from './DeleteConfirmModal';

describe('DeleteConfirmModal', () => {
  it('focuses cancel first and dismisses on Escape without deleting', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<DeleteConfirmModal isOpen onConfirm={onConfirm} onClose={onClose} />);
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Xác nhận xóa bản ghi chẩn đoán?');
    expect(screen.getByRole('button', { name: 'Hủy bỏ' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('only requests deletion after explicit confirmation', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<DeleteConfirmModal isOpen onConfirm={onConfirm} onClose={onClose} />);
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

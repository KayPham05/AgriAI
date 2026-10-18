import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AdminRecordList, formatAdminDate } from '@/features/admin/AdminRecordList';

const items = Array.from({ length: 12 }, (_, index) => ({
  id: String(index),
  fullName: index === 0 ? 'Đặng Thị Ánh' : `Người dùng ${index + 1}`,
  email: `user${index + 1}@example.test`,
}));
function List({ records = items }: { records?: typeof items }) {
  return (
    <AdminRecordList resource="users" items={records} title="Tài khoản" empty="Chưa có tài khoản">
      {(item) => <span>{item.fullName}</span>}
    </AdminRecordList>
  );
}

describe('Admin record list', () => {
  it('uses a readable fallback for invalid timestamps', () => {
    expect(formatAdminDate('not-a-date')).toBe('Không có thời gian');
  });

  it('handles incomplete records without crashing search', async () => {
    render(
      <AdminRecordList
        resource="users"
        items={[{ id: 'incomplete' }]}
        title="Tài khoản"
        empty="Chưa có tài khoản"
      >
        {(item) => <span>{item.id}</span>}
      </AdminRecordList>,
    );
    expect(screen.getByText('incomplete')).toBeVisible();
    await userEvent.type(screen.getByRole('textbox'), 'abc{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Không tìm thấy kết quả phù hợp.');
  });
  it('paginates twelve records without duplicates and disables boundary controls', async () => {
    const user = userEvent.setup();
    render(<List />);
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Người dùng 11')).toBeVisible();
    expect(screen.queryByText('Đặng Thị Ánh')).toBeNull();
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Trang trước' }));
    expect(screen.getByText('Đặng Thị Ánh')).toBeVisible();
  });

  it('applies accent-insensitive search only on submit and resets the page', async () => {
    const user = userEvent.setup();
    render(<List />);
    await user.click(screen.getByRole('button', { name: 'Trang sau' }));
    await user.type(screen.getByRole('textbox'), '  DANG thi anh  ');
    expect(screen.getByText('Người dùng 11')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Đặng Thị Ánh')).toBeVisible();
    expect(screen.getByText('Trang 1 / 1')).toBeVisible();
  });

  it('distinguishes an empty collection from an unmatched email search', async () => {
    const user = userEvent.setup();
    const view = render(<List records={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('Chưa có tài khoản');
    expect(screen.queryByRole('navigation')).toBeNull();
    view.rerender(<List />);
    await user.type(screen.getByRole('textbox'), 'USER12@EXAMPLE.TEST');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    expect(screen.getByText('Người dùng 12')).toBeVisible();
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'missing@example.test');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    expect(screen.getByRole('status')).toHaveTextContent('Không tìm thấy kết quả phù hợp.');
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('clamps the current page when the collection shrinks', async () => {
    const user = userEvent.setup();
    const view = render(<List />);
    await user.click(screen.getByRole('button', { name: 'Trang sau' }));
    view.rerender(<List records={items.slice(0, 2)} />);
    expect(screen.getByText('Trang 1 / 1')).toBeVisible();
    expect(screen.getByText('Đặng Thị Ánh')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('searches image and session owner fields', async () => {
    const user = userEvent.setup();
    render(
      <AdminRecordList
        resource="images"
        items={[{ id: 'image', userName: 'Đỗ Bình', userEmail: 'binh@example.test' }]}
        title="Ảnh"
        empty="Chưa có ảnh"
        initialQuery="do binh"
      >
        {(item) => <span>{item.userEmail}</span>}
      </AdminRecordList>,
    );
    expect(screen.getByText('binh@example.test')).toBeVisible();
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'BINH@EXAMPLE.TEST{Enter}');
    expect(screen.getByText('binh@example.test')).toBeVisible();
  });
});

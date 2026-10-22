import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => vi.useRealTimers());

  it.each(['users', 'images', 'sessions'] as const)(
    'automatically filters %s after 500ms and returns to the first page',
    (resource) => {
      vi.useFakeTimers();
      render(
        <AdminRecordList
          resource={resource}
          items={items.map(({ id, fullName, email }) =>
            resource === 'users'
              ? { id, fullName, email }
              : { id, userName: fullName, userEmail: email },
          )}
          title="Bản ghi"
          empty="Chưa có dữ liệu"
        >
          {(item) => <span>{'fullName' in item ? item.fullName : item.userName}</span>}
        </AdminRecordList>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '  DANG thi anh  ' } });
      act(() => vi.advanceTimersByTime(499));
      expect(screen.getByText('Người dùng 3')).toBeVisible();
      act(() => vi.advanceTimersByTime(1));
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      expect(screen.getByText('Đặng Thị Ánh')).toBeVisible();
      expect(screen.getByText('Trang 1 / 1')).toBeVisible();
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
      act(() => vi.advanceTimersByTime(500));
      expect(screen.getByText('Trang 1 / 6')).toBeVisible();
    },
  );

  it('restarts the debounce after each edit and cancels pending search on unmount', () => {
    vi.useFakeTimers();
    const view = render(<List />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'missing' } });
    act(() => vi.advanceTimersByTime(400));
    fireEvent.change(input, { target: { value: 'USER12@EXAMPLE.TEST' } });
    act(() => vi.advanceTimersByTime(100));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Đặng Thị Ánh')).toBeVisible();
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByText('Người dùng 12')).toBeVisible();
    fireEvent.change(input, { target: { value: 'pending' } });
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('submits immediately and cancels debounce so later pagination is preserved', () => {
    vi.useFakeTimers();
    render(<List />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'nguoi dung' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(screen.getByText('Trang 2 / 6')).toBeVisible();
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByText('Trang 2 / 6')).toBeVisible();
  });
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
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Người dùng 3')).toBeVisible();
    expect(screen.queryByText('Đặng Thị Ánh')).toBeNull();
    for (let page = 2; page < 6; page++) {
      await user.click(screen.getByRole('button', { name: 'Trang sau' }));
    }
    expect(screen.getByText('Người dùng 12')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Trang trước' }));
    expect(screen.getByText('Người dùng 9')).toBeVisible();
  });

  it('supports immediate accent-insensitive search on submit and resets the page', async () => {
    const user = userEvent.setup();
    render(<List />);
    await user.click(screen.getByRole('button', { name: 'Trang sau' }));
    await user.type(screen.getByRole('textbox'), '  DANG thi anh  ');
    expect(screen.getByText('Người dùng 3')).toBeVisible();
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

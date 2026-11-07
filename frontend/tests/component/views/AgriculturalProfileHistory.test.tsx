import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AgriculturalProfileHistory } from '@/components/agricultural-profile/AgriculturalProfileHistory';

const item = {
  id: 'result-1',
  imagePath: '/leaf.jpg',
  plantName: 'Rice',
  plantVietnameseName: 'Lúa',
  diseaseName: 'Healthy',
  diseaseVietnameseName: 'Khỏe mạnh',
  confidence: 0.94,
  createdAt: '2026-10-24T01:30:00Z',
  agriculturalProfileId: 'garden',
  images: [],
  hasHistoricalSnapshot: true,
};

describe('profile diagnosis history', () => {
  it('recovers from a failed load and opens the selected real history item', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ message: 'Không thể tải lịch sử.' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [item],
          pageNumber: 1,
          pageSize: 10,
          totalCount: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const onView = vi.fn().mockResolvedValue(undefined);
    render(<AgriculturalProfileHistory profileId="garden" token="token" onView={onView} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải lịch sử.');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect((await screen.findAllByText('Lúa')).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Xem kết quả đã lưu' }));
    expect(onView).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'result-1', plant: 'Lúa', prediction: 'Khỏe mạnh' }),
    );
  });

  it('loads subsequent profile pages and replaces the previous page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [item],
          pageNumber: 1,
          pageSize: 10,
          totalCount: 11,
          totalPages: 2,
          hasPreviousPage: false,
          hasNextPage: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ ...item, id: 'result-11', plantVietnameseName: 'Cà chua' }],
          pageNumber: 2,
          pageSize: 10,
          totalCount: 11,
          totalPages: 2,
          hasPreviousPage: true,
          hasNextPage: false,
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    render(<AgriculturalProfileHistory profileId="garden" token="token" onView={vi.fn()} />);
    expect((await screen.findAllByText('Lúa')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect((await screen.findAllByText('Cà chua')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Lúa', { selector: 'p' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled();
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/predictions?agriculturalProfileId=garden&pageNumber=2&pageSize=10',
      expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
    );
  });
});

it('confirms removal from the profile and preserves saved results', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ items: [item], hasNextPage: false }),
  });
  vi.stubGlobal('fetch', fetchMock);
  const onRemoved = vi.fn();
  render(
    <AgriculturalProfileHistory
      profileId="garden"
      token="token"
      onView={vi.fn()}
      onRemoved={onRemoved}
    />,
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Xóa khỏi hồ sơ' }));
  expect(screen.getByRole('alertdialog')).toHaveTextContent('Mẫu đã lưu');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole('button', { name: 'Xóa khỏi hồ sơ' }));
  fetchMock
    .mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => {
        throw new SyntaxError('No content');
      },
    })
    .mockResolvedValue({ ok: true, json: async () => ({ items: [], hasNextPage: false }) });
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/predictions/result-1/agricultural-profile/garden',
    expect.objectContaining({ method: 'DELETE' }),
  );
  await waitFor(() => expect(onRemoved).toHaveBeenCalledOnce());
  expect(screen.queryByRole('button', { name: 'Xem kết quả đã lưu' })).not.toBeInTheDocument();
});

it('keeps the result and count when removal fails and allows retry', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [item], hasNextPage: false }),
    })
    .mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ message: 'Không thể gỡ kết quả' }),
    });
  vi.stubGlobal('fetch', fetchMock);
  const onRemoved = vi.fn();
  render(
    <AgriculturalProfileHistory
      profileId="garden"
      token="token"
      onView={vi.fn()}
      onRemoved={onRemoved}
    />,
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Xóa khỏi hồ sơ' }));
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Không thể gỡ kết quả');
  expect(onRemoved).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
  expect(screen.getByRole('button', { name: 'Xem kết quả đã lưu' })).toBeVisible();
});

import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KnowledgeAdmin } from '@/features/knowledge/KnowledgeAdmin';
import { article, medicine, pair, page, json } from '../../helpers/knowledge';

describe('knowledge administration with real API adapter', () => {
  it.each(['plants', 'diseases'] as const)(
    'shows read-only metadata below %s status in list and detail',
    async (kind) => {
      const record = {
        id: kind === 'plants' ? pair.plantId : pair.diseaseId,
        name: 'Catalog',
        isActive: true,
        createdAt: '',
        conditionType: 'NutrientDeficiency',
      };
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
          if (url.includes('plant-diseases'))
            return json(
              page([pair, { ...pair, id: 'other', plantId: 'other', diseaseName: 'Unrelated' }]),
            );
          return json(url.endsWith(record.id) ? record : [record]);
        }),
      );
      render(<KnowledgeAdmin kind={kind} token="admin" />);
      const text = kind === 'plants' ? 'Cháy lá' : 'Phân loại tình trạng: Thiếu dinh dưỡng';
      expect(await screen.findByText(text)).toBeVisible();
      expect(screen.queryByText('Unrelated')).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Mở Catalog' }));
      expect(await screen.findByText(text)).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Mở chi tiết' })).not.toBeInTheDocument();
    },
  );
  it.each(['plants', 'diseases'] as const)(
    'creates %s through its protected CRUD endpoint',
    async (kind) => {
      const writes: unknown[] = [];
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init?: RequestInit) => {
          if (url.includes('plant-diseases')) return json(page([pair]));
          if (init?.method === 'POST') {
            const body = JSON.parse(String(init.body));
            writes.push({ url, body, headers: init.headers });
            return json(
              { ...body, id: 'created', isActive: true, createdAt: '', isContentApproved: false },
              201,
            );
          }
          return json([]);
        }),
      );
      render(<KnowledgeAdmin kind={kind} token="admin" />);
      await screen.findByText('Chưa có kết quả phù hợp.');
      await userEvent.click(screen.getByRole('button', { name: 'Thêm mới' }));
      await userEvent.type(screen.getByLabelText('Tên danh mục'), 'Catalog fixture');
      await userEvent.click(screen.getByRole('button', { name: 'Lưu nội dung' }));
      expect(await screen.findByRole('heading', { name: 'Catalog fixture' })).toBeVisible();
      expect(writes).toEqual([
        expect.objectContaining({
          url: `/api/${kind}`,
          body: expect.objectContaining({ name: 'Catalog fixture' }),
          headers: expect.objectContaining({ Authorization: 'Bearer admin' }),
        }),
      ]);
    },
  );

  it.each([401, 403])('retains draft on a %s write error', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('plant-diseases')) return json(page([pair]));
        if (init?.method === 'PUT') return json({}, status);
        return json(url.includes('article-a') ? article : page([article]));
      }),
    );
    render(<KnowledgeAdmin kind="knowledge-documents" token="admin" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Mở Chăm sóc vườn' }));
    await userEvent.type(screen.getByLabelText('Tiêu đề'), ' mới');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu nội dung' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      status === 401 ? 'hết hạn' : 'không có quyền',
    );
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Chăm sóc vườn mới');
    expect(screen.getByRole('button', { name: 'Ẩn công khai' })).toBeDisabled();
  });
  it('locks parent editing and publication while label changes are being persisted', async () => {
    let finish: (value: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('plant-diseases')) return json(page([pair]));
        if (init?.method === 'PUT')
          return new Promise<Response>((resolve) => {
            finish = resolve;
          });
        return json(url.includes('medicine-a') ? medicine : page([medicine]));
      }),
    );
    render(<KnowledgeAdmin kind="medicines" token="admin" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Mở Sản phẩm kiểm thử' }));
    await userEvent.click(await screen.findByRole('button', { name: /Sửa hướng dẫn Cà chua/ }));
    await userEvent.type(screen.getByLabelText('Hướng dẫn trên nhãn'), ' mới');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hướng dẫn' }));
    expect(screen.getByRole('button', { name: 'Thu hồi duyệt' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lưu nội dung' })).toBeDisabled();
    await act(async () => finish(json(medicine.uses?.[0])));
  });

  it('deactivates and restores an article without automatically republishing it', async () => {
    let saved = { ...article };
    const writes: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('plant-diseases')) return json(page([pair]));
        if (init?.method === 'DELETE') {
          saved = { ...saved, isActive: false, isApproved: false, isPublic: false };
          return new Response(null, { status: 204 });
        }
        if (init?.method === 'PUT') {
          const body = JSON.parse(String(init.body));
          writes.push(body);
          saved = { ...saved, ...body };
        }
        return json(url.includes('article-a') ? saved : page([saved]));
      }),
    );
    render(<KnowledgeAdmin kind="knowledge-documents" token="admin" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Mở Chăm sóc vườn' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ngừng hoạt động' }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xác nhận' }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Khôi phục hoạt động' }));
    expect(await screen.findByText('Đang hoạt động')).toBeVisible();
    expect(screen.getByText('Chưa duyệt')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Công khai' })).toBeDisabled();
    expect(writes).toEqual([{ isActive: true, isApproved: false, isPublic: false }]);
  });
  it('reads trigger-revoked flags after editing and publishes only in a later action', async () => {
    let saved = { ...article };
    const writes: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('plant-diseases')) return json(page([pair]));
        if (init?.method === 'PUT') {
          const body = JSON.parse(String(init.body));
          writes.push(body);
          saved = url.endsWith('/publication')
            ? { ...saved, ...body }
            : {
                ...saved,
                ...body,
                isApproved: false,
                isPublic: false,
                updatedAt: '2026-10-25T01:00:00Z',
              };
          return json(saved);
        }
        return json(url.includes('article-a') ? saved : page([saved]));
      }),
    );
    render(<KnowledgeAdmin kind="knowledge-documents" token="admin" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Mở Chăm sóc vườn' }));
    await userEvent.type(await screen.findByLabelText('Tiêu đề'), ' cập nhật');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu nội dung' }));
    expect(await screen.findByText('Chưa duyệt')).toBeVisible();
    expect(writes).toHaveLength(1);
    expect(writes[0]).not.toHaveProperty('isApproved');
    await userEvent.click(screen.getByRole('button', { name: 'Duyệt nội dung' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Công khai' }));
    expect(writes[2]).toEqual({ isActive: true, isApproved: true, isPublic: true });
  });
  it('requires confirmation before soft-deactivation and never claims a failed write succeeded', async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('plant-diseases')) return json(page([pair]));
      if (init?.method === 'DELETE') return json({ message: 'Không lưu được' }, 500);
      return json(url.includes('article-a') ? article : page([article]));
    });
    vi.stubGlobal('fetch', fetch);
    render(<KnowledgeAdmin kind="knowledge-documents" token="admin" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Mở Chăm sóc vườn' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Ngừng hoạt động' }));
    expect(fetch.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xác nhận' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Không lưu được');
  });
  it('revokes parent publication after saving changed label directions', async () => {
    let saved = { ...medicine };
    const writes: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('plant-diseases')) return json(page([pair]));
        if (url.includes('/uses/') && init?.method === 'PUT') {
          const body = JSON.parse(String(init.body));
          writes.push(body);
          saved = {
            ...saved,
            isApproved: false,
            isPublic: false,
            uses: [{ ...medicine.uses?.[0], ...body, isApproved: false, isLabelVerified: false }],
          };
          return json(saved.uses?.[0]);
        }
        return json(url.includes('medicine-a') ? saved : page([saved]));
      }),
    );
    render(<KnowledgeAdmin kind="medicines" token="admin" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Mở Sản phẩm kiểm thử' }));
    await userEvent.click(await screen.findByRole('button', { name: /Sửa hướng dẫn Cà chua/ }));
    await userEvent.type(screen.getByLabelText('Hướng dẫn trên nhãn'), ' mới');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hướng dẫn' }));
    expect(await screen.findByText('Chưa duyệt')).toBeVisible();
    expect(writes[0]).toEqual({ labelDirections: 'Hướng dẫn kiểm thử mới' });
  });
});

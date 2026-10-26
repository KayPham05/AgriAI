import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PublicCatalog } from '@/features/knowledge/PublicCatalog';
import { article, medicine, pair, page, json } from '../../helpers/knowledge';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('public knowledge catalog', () => {
  it('ignores an older detail response after navigation', async () => {
    const older: ((value: Response) => void)[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('plant-diseases')) return json(page([pair]));
        if (url.endsWith('/older')) return new Promise<Response>((resolve) => older.push(resolve));
        return json({ ...article, title: 'Nội dung hiện tại' });
      }),
    );
    const view = render(<PublicCatalog kind="knowledge-documents" id="older" />);
    await waitFor(() => expect(older.length).toBeGreaterThan(0));
    view.rerender(<PublicCatalog kind="knowledge-documents" id="newer" />);
    expect(await screen.findByRole('heading', { name: 'Nội dung hiện tại' })).toBeVisible();
    await act(async () => {
      for (const resolve of older) resolve(json({ ...article, title: 'Nội dung cũ' }));
    });
    expect(screen.queryByText('Nội dung cũ')).not.toBeInTheDocument();
  });

  it('retries network errors and shows the public empty state', async () => {
    let failed = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('plant-diseases')) return json(page([]));
        if (failed) throw new TypeError('offline');
        return json(page([]));
      }),
    );
    render(<PublicCatalog kind="knowledge-documents" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối');
    failed = false;
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Chưa có nội dung phù hợp được công khai.')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('loads published article without auth, shows source and treats HTML as text', async () => {
    const fetch = vi.fn(async (url: string) =>
      json(
        url.includes('plant-diseases')
          ? page([pair])
          : { ...article, content: '<script>unsafe()</script>' },
      ),
    );
    vi.stubGlobal('fetch', fetch);
    render(<PublicCatalog kind="knowledge-documents" id="article-a" />);
    expect(await screen.findByRole('heading', { name: 'Chăm sóc vườn' })).toBeVisible();
    expect(screen.getByText('<script>unsafe()</script>')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Xem nguồn tham khảo' })).toHaveAttribute(
      'href',
      'https://example.test/source',
    );
    expect(document.querySelector('script')).toBeNull();
    for (const [, init] of fetch.mock.calls as unknown as [string, RequestInit][])
      expect(init.headers).not.toHaveProperty('Authorization');
  });
  it('shows not available on 404 without substituting static advice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('plant-diseases') ? json(page([])) : new Response('', { status: 404 }),
      ),
    );
    render(<PublicCatalog kind="medicines" id="missing" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('không còn khả dụng');
    expect(screen.queryByText('Sản phẩm kiểm thử')).not.toBeInTheDocument();
  });
  it('searches on server and renders its total rather than a filtered partial-page total', async () => {
    const fetch = vi.fn(async (url: string) =>
      json(url.includes('plant-diseases') ? page([pair]) : page([article], 41)),
    );
    vi.stubGlobal('fetch', fetch);
    render(<PublicCatalog kind="knowledge-documents" />);
    expect(await screen.findByText(/41 kết quả/)).toBeVisible();
    await userEvent.type(screen.getByLabelText('Tìm kiếm danh mục'), 'chăm sóc');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(
          ([url]) => new URL(url, 'http://localhost').searchParams.get('search') === 'chăm sóc',
        ),
      ).toBe(true),
    );
  });
  it('shows verified use directions with the matching crop and safety information', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => json(url.includes('plant-diseases') ? page([pair]) : medicine)),
    );
    render(<PublicCatalog kind="medicines" id="medicine-a" />);
    expect(await screen.findByText('Hướng dẫn kiểm thử')).toBeVisible();
    expect(screen.getByText('Cảnh báo kiểm thử')).toBeVisible();
    expect(screen.getByText('Cà chua / Cháy lá')).toBeVisible();
  });
});

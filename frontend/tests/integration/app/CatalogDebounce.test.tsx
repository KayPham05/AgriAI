import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicCatalog } from '@/features/knowledge/PublicCatalog';
import { KnowledgeAdmin } from '@/features/knowledge/KnowledgeAdmin';
import { PlantDiseaseManager } from '@/features/knowledge/PlantDiseaseManager';
import { article, pair, page, json } from '../../helpers/knowledge';

const navigation = vi.hoisted(() => ({ query: '', push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

beforeEach(() => {
  navigation.query = '';
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function setup(admin: boolean, kind: 'plants' | 'knowledge-documents') {
  const fetch = vi.fn(async (url: string) => {
    if (url.includes('plant-diseases')) return json(page([pair]));
    if (kind === 'plants') return json([{ id: 'plant', name: 'Cà chua', isActive: true }]);
    const query = new URL(url, 'http://localhost').searchParams;
    return json(page(query.get('search') ? [] : [article]));
  });
  vi.stubGlobal('fetch', fetch);
  const view = render(
    admin ? <KnowledgeAdmin kind={kind} token="admin" /> : <PublicCatalog kind={kind} />,
  );
  await act(async () => {});
  vi.useFakeTimers();
  return {
    fetch,
    view,
    input: screen.getByLabelText(admin ? 'Tìm trong danh mục' : 'Tìm kiếm danh mục'),
  };
}

describe.each([
  { admin: false, kind: 'plants' as const },
  { admin: false, kind: 'knowledge-documents' as const },
  { admin: true, kind: 'plants' as const },
  { admin: true, kind: 'knowledge-documents' as const },
])('catalog debounce: admin=$admin kind=$kind', ({ admin, kind }) => {
  it('filters only 500ms after the final edit and clears immediately', async () => {
    const { input, fetch } = await setup(admin, kind);
    const initial = fetch.mock.calls.length;
    fireEvent.change(input, { target: { value: 'missing' } });
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    fireEvent.change(input, { target: { value: 'missing-final' } });
    await act(async () => {
      vi.advanceTimersByTime(499);
    });
    expect(fetch.mock.calls).toHaveLength(initial);
    expect(screen.getByText(/1 kết quả/)).toBeVisible();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText(/0 kết quả/)).toBeVisible();
    fireEvent.change(input, { target: { value: '' } });
    await act(async () => {});
    expect(screen.getByText(/1 kết quả/)).toBeVisible();
  });
  it('submits immediately and does not repeat a submitted request after the delay', async () => {
    const { input, fetch } = await setup(admin, kind);
    fireEvent.change(input, { target: { value: 'missing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    await act(async () => {});
    expect(screen.getByText(/0 kết quả/)).toBeVisible();
    const submitted = fetch.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(fetch.mock.calls).toHaveLength(submitted);
  });
});

it('cancels a pending search on browser query navigation and preserves its page', async () => {
  const { input, view } = await setup(false, 'knowledge-documents');
  fireEvent.change(input, { target: { value: 'stale' } });
  navigation.query = 'search=restored&pageNumber=2';
  view.rerender(<PublicCatalog kind="knowledge-documents" />);
  await act(async () => {
    vi.advanceTimersByTime(500);
  });
  expect(input).toHaveValue('restored');
  expect(navigation.push).not.toHaveBeenCalled();
});

it('resets the page after debouncing while retaining the selected crop', async () => {
  navigation.query = 'pageNumber=2&plantId=plant-a';
  const { input } = await setup(false, 'knowledge-documents');
  fireEvent.change(input, { target: { value: '  chăm sóc  ' } });
  await act(async () => {
    vi.advanceTimersByTime(500);
  });
  const destination = new URL(navigation.push.mock.calls[0][0], 'http://localhost');
  expect(destination.searchParams.get('pageNumber')).toBe('1');
  expect(destination.searchParams.get('plantId')).toBe('plant-a');
  expect(destination.searchParams.get('search')).toBe('chăm sóc');
});

it('does not issue a pending search after leaving the catalog', async () => {
  const { input, view, fetch } = await setup(true, 'knowledge-documents');
  fireEvent.change(input, { target: { value: 'pending' } });
  const initial = fetch.mock.calls.length;
  view.unmount();
  await act(async () => {
    vi.advanceTimersByTime(500);
  });
  expect(fetch.mock.calls).toHaveLength(initial);
});

it('debounces the plant/disease relationship filter without extra requests', async () => {
  const fetch = vi.fn(async () => json(page([pair])));
  vi.stubGlobal('fetch', fetch);
  render(<PlantDiseaseManager token="admin" />);
  await act(async () => {});
  vi.useFakeTimers();
  fireEvent.change(screen.getByLabelText('Tìm cây hoặc bệnh'), { target: { value: 'missing' } });
  expect(screen.getByRole('heading', { name: 'Cà chua / Cháy lá' })).toBeVisible();
  await act(async () => {
    vi.advanceTimersByTime(500);
  });
  expect(screen.queryByRole('heading', { name: 'Cà chua / Cháy lá' })).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledOnce();
});

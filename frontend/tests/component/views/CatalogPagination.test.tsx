import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { ALL_DISEASES, SUPPORTED_PLANTS } from '@/data/plantData';
import type { Disease } from '@/types';
import { DiseasesPage } from '@/views/DiseasesPage';
import { PlantsPage } from '@/views/PlantsPage';

const diseases: Disease[] = Array.from({ length: 22 }, (_, index) => ({
  ...ALL_DISEASES[0],
  id: `fixture-${index + 1}`,
  name: `Bệnh mẫu ${index + 1}`,
  plant: index < 12 ? 'Lúa' : 'Ngô',
  category: index < 12 ? 'Fungal' : 'Viral',
}));
const plants = Array.from({ length: 12 }, (_, index) => ({
  ...SUPPORTED_PLANTS[0],
  id: `fixture-${index + 1}`,
  name: `Cây mẫu ${index + 1}`,
}));
const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  }),
);
afterAll(() => {
  if (scrollDescriptor)
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor);
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});

function renderDiseases(items = diseases) {
  return render(
    <DiseasesPage diseases={items} onSelectDisease={vi.fn()} onDiagnoseDiseasePlant={vi.fn()} />,
  );
}

describe('catalog pagination', () => {
  it('limits disease cards and navigates to the partial last page with keyboard', async () => {
    const user = userEvent.setup();
    renderDiseases();
    expect(screen.getAllByRole('article')).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled();
    const next = screen.getByRole('button', { name: 'Trang sau' });
    next.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Bệnh mẫu 7' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Trang 3' }));
    await user.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByRole('heading', { name: 'Bệnh mẫu 22' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Trang 4' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: 'Trang trước' }));
    expect(screen.getAllByRole('article')).toHaveLength(6);
  });

  it('searches the full disease list and resets paging when the query changes', async () => {
    const user = userEvent.setup();
    renderDiseases();
    await user.click(screen.getByRole('button', { name: 'Trang 3' }));
    await user.type(screen.getByRole('searchbox'), 'Bệnh mẫu 22');
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1));
    expect(screen.getByRole('heading', { name: 'Bệnh mẫu 22' })).toBeVisible();
    await waitFor(() => expect(screen.queryByRole('navigation')).not.toBeInTheDocument());
    await user.clear(screen.getByRole('searchbox'));
    expect(screen.getByRole('heading', { name: 'Bệnh mẫu 1' })).toBeVisible();
  });

  it('resets to the first page when changing the category', async () => {
    const user = userEvent.setup();
    renderDiseases();
    await user.click(screen.getByRole('button', { name: 'Trang 3' }));
    await user.click(
      within(screen.getByRole('group', { name: 'Nhóm bệnh' })).getByRole('button', { name: 'Nấm' }),
    );
    expect(screen.getAllByRole('article')).toHaveLength(6);
    expect(screen.getByRole('heading', { name: 'Bệnh mẫu 1' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(screen.getAllByRole('article')).toHaveLength(6);
  });

  it('clamps paging after data shrinks and hides controls for empty results', async () => {
    const user = userEvent.setup();
    const view = renderDiseases();
    await user.click(screen.getByRole('button', { name: 'Trang 3' }));
    view.rerender(
      <DiseasesPage
        diseases={diseases.slice(0, 10)}
        onSelectDisease={vi.fn()}
        onDiagnoseDiseasePlant={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByRole('heading', { name: 'Bệnh mẫu 7' })).toBeVisible();
    await user.type(screen.getByRole('searchbox'), 'không tồn tại');
    await waitFor(() => expect(screen.queryByRole('article')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole('navigation')).not.toBeInTheDocument());
  });

  it('bounds the number of numeric controls for long catalogs', () => {
    renderDiseases(
      Array.from({ length: 90 }, (_, index) => ({
        ...diseases[0],
        id: `long-${index}`,
        name: `Dài ${index}`,
      })),
    );
    const pager = within(screen.getByRole('navigation'));
    expect(pager.getAllByRole('button', { name: /^Trang \d+$/ })).toHaveLength(3);
  });

  it('paginates plants and preserves the visible item selection', async () => {
    const user = userEvent.setup();
    const selected = vi.fn();
    render(<PlantsPage plants={plants} onSelectPlant={selected} onDiagnosePlant={vi.fn()} />);
    expect(screen.getAllByRole('article')).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(screen.getAllByRole('article')).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: 'Xem chi tiết Cây mẫu 10' }));
    expect(selected).toHaveBeenCalledWith(plants[9]);
    await user.type(screen.getByRole('searchbox'), 'Cây mẫu 1');
    expect(await screen.findByRole('heading', { name: 'Cây mẫu 1' })).toBeVisible();
    await waitFor(() => expect(screen.queryByRole('navigation')).not.toBeInTheDocument());
  });

  it('keeps two rows when the number of grid columns changes', async () => {
    let width = 1280;
    const listeners = new Set<() => void>();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: width >= (query.includes('1024') ? 1024 : 768),
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    }));
    render(<PlantsPage plants={plants} onSelectPlant={vi.fn()} onDiagnosePlant={vi.fn()} />);
    expect(screen.getAllByRole('article')).toHaveLength(6);
    act(() => {
      width = 768;
      for (const listener of listeners) listener();
    });
    expect(screen.getAllByRole('article')).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(screen.getByRole('heading', { name: 'Cây mẫu 5' })).toBeVisible();
    act(() => {
      width = 375;
      for (const listener of listeners) listener();
    });
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Cây mẫu 3' })).toBeVisible();
  });
});

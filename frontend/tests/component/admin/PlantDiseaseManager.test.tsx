import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { PlantDiseaseManager } from '@/features/knowledge/PlantDiseaseManager';
import { json, page, pair } from '../../helpers/knowledge';
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = '';
});
it('displays readable disease names without changing classifier keys', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url === '/api/diseases'
        ? json([{ id: 'other', name: 'Dom_la', isActive: true, createdAt: '' }])
        : json(
            page([
              {
                ...pair,
                plantName: 'Lua',
                diseaseName: 'Bac_la_lua',
                className: 'Lua___Bac_la_lua',
              },
            ]),
          ),
    ),
  );
  render(<PlantDiseaseManager token="admin" plantId={pair.plantId} />);
  expect(await screen.findByRole('heading', { name: 'Lua / Bac la lua' })).toBeVisible();
  expect(screen.getByText('Lua___Bac_la_lua (0)')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Bệnh hoặc tình trạng mới' }));
  expect(screen.getByRole('option', { name: 'Dom la' })).toBeVisible();
});

it('changes only availability of an existing AI pair after confirmation', async () => {
  let current = pair;
  const writes: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/diseases') return json([]);
      if (init?.method === 'PUT') {
        const body = JSON.parse(String(init.body));
        writes.push(body);
        current = { ...pair, ...body };
        return json(current);
      }
      return json(page([current]));
    }),
  );
  render(<PlantDiseaseManager token="admin" plantId={pair.plantId} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Ngừng liên kết' }));
  expect(writes).toHaveLength(0);
  await userEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xác nhận' }),
  );
  expect(await screen.findByRole('button', { name: 'Khôi phục liên kết' })).toBeVisible();
  expect(writes).toEqual([{ isActive: false }]);
  expect(screen.queryByRole('textbox', { name: /class/i })).not.toBeInTheDocument();
});

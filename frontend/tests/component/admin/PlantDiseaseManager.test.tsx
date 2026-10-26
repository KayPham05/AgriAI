import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { PlantDiseaseManager } from '@/features/knowledge/PlantDiseaseManager';
import { json, page, pair } from '../../helpers/knowledge';
it('changes only availability of an existing AI pair after confirmation', async () => {
  let current = pair;
  const writes: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        const body = JSON.parse(String(init.body));
        writes.push(body);
        current = { ...pair, ...body };
        return json(current);
      }
      return json(page([current]));
    }),
  );
  render(<PlantDiseaseManager token="admin" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Ngừng liên kết' }));
  expect(writes).toHaveLength(0);
  await userEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xác nhận' }),
  );
  expect(await screen.findByRole('button', { name: 'Khôi phục liên kết' })).toBeVisible();
  expect(writes).toEqual([{ isActive: false }]);
  expect(screen.queryByRole('textbox', { name: /class/i })).not.toBeInTheDocument();
});

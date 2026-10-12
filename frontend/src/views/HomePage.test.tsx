import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';
import { SUPPORTED_PLANTS } from '../data/plantData';

describe('HomePage', () => {
  beforeEach(() => {
    // Radix scrolls the focused option; jsdom has no scroll layout.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('keeps the primary tasks reachable', async () => {
    const onNavigate = vi.fn();
    render(<HomePage onNavigate={onNavigate} onSelectPlant={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Hiểu từng chiếc lá. Giữ trọn mùa xanh.' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra lá' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tra cứu bệnh' }));
    expect(onNavigate.mock.calls).toEqual([['diagnose'], ['diseases']]);
  });

  it('opens the selected plant rather than the initial preview', async () => {
    const onSelectPlant = vi.fn();
    const user = userEvent.setup();
    render(<HomePage onNavigate={vi.fn()} onSelectPlant={onSelectPlant} />);
    const targetPlant = SUPPORTED_PLANTS[SUPPORTED_PLANTS.length - 1];
    const picker = screen.getByRole('combobox', { name: 'Cây trong cẩm nang' });
    picker.focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('option', { name: targetPlant.name }));
    expect(screen.getByRole('heading', { name: targetPlant.name, level: 3 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tìm hiểu cây' }));
    expect(onSelectPlant).toHaveBeenCalledWith(targetPlant);
  });
});

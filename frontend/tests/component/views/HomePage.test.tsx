import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HomePage } from '@/views/HomePage';
import { SUPPORTED_PLANTS } from '@/data/plantData';

describe('HomePage', () => {
  it('shows the centered landing hero and keeps the original Home guidance', () => {
    render(<HomePage onNavigate={vi.fn()} onSelectPlant={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: 'Hiểu từng chiếc lá Giữ trọn mùa xanh' }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Trước khi chụp ảnh: 3 lưu ý vàng' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Tìm hiểu cây bạn đang trồng' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Khám phá AgriAI' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Ảnh cây trồng tương tác' })).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Chọn tính năng' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Rõ ràng từ thao tác đầu tiên.' })).toBeNull();
  });

  it('keeps the primary tasks reachable', async () => {
    const onNavigate = vi.fn();
    render(<HomePage onNavigate={onNavigate} onSelectPlant={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: 'Hiểu từng chiếc lá Giữ trọn mùa xanh' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra lá' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tra cứu bệnh' }));
    expect(onNavigate.mock.calls).toEqual([['diagnose'], ['diseases']]);
  });

  it('opens a plant from its catalog card without the removed selector', async () => {
    const onSelectPlant = vi.fn();
    const user = userEvent.setup();
    render(<HomePage onNavigate={vi.fn()} onSelectPlant={onSelectPlant} />);
    const targetPlant = SUPPORTED_PLANTS.find((plant) => plant.id === 'coffee');
    expect(screen.queryByRole('combobox', { name: 'Cây trong cẩm nang' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Tìm hiểu cây Cà phê' }));
    expect(onSelectPlant).toHaveBeenCalledWith(targetPlant);
  });
});

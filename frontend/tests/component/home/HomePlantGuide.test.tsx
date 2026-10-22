import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HomePlantGuide } from '@/components/home/HomePlantGuide';
import { SUPPORTED_PLANTS } from '@/data/plantData';

describe('HomePlantGuide', () => {
  it('presents three photo tips and four featured plant cards', () => {
    render(<HomePlantGuide onNavigate={vi.fn()} onSelectPlant={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Trước khi chụp ảnh: 3 lưu ý vàng' })).toBeVisible();
    expect(screen.queryByText(/98%/)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Bạn đang trồng cây gì?' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Cây trong cẩm nang' })).toBeNull();
    expect(
      screen.queryByText('Chọn cây để tìm hiểu đặc điểm và những bệnh lá thường gặp.'),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tìm hiểu cây' })).toBeNull();
    expect(
      within(screen.getByRole('list', { name: 'Lưu ý chụp ảnh' })).getAllByRole('listitem'),
    ).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Nổi bật' })).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByRole('tabpanel')).getAllByRole('heading', { level: 3 })).toHaveLength(
      4,
    );
  });

  it('filters plant cards by category and opens the chosen plant', async () => {
    const select = vi.fn();
    render(<HomePlantGuide onNavigate={vi.fn()} onSelectPlant={select} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Cây ăn trái' }));
    const panel = within(screen.getByRole('tabpanel'));
    const expected = SUPPORTED_PLANTS.filter((plant) => plant.category === 'Cây ăn trái');
    expect(panel.getAllByRole('heading', { level: 3 })).toHaveLength(expected.length);
    const target = expected[expected.length - 1];
    await userEvent.click(panel.getByRole('button', { name: `Tìm hiểu cây ${target.name}` }));
    expect(select).toHaveBeenCalledWith(target);
  });

  it('keeps category tabs keyboard accessible and links to the existing catalog', async () => {
    const navigate = vi.fn();
    render(<HomePlantGuide onNavigate={navigate} onSelectPlant={vi.fn()} />);
    screen.getByRole('tab', { name: 'Nổi bật' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Cây công nghiệp' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Xem tất cả cây trồng' }));
    expect(navigate).toHaveBeenCalledWith('plants');
  });
});

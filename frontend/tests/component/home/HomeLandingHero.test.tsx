import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HomeLandingHero } from '@/components/home/HomeLandingHero';

describe('HomeLandingHero', () => {
  it('curves both headline lines while keeping one readable heading', () => {
    const { container } = render(<HomeLandingHero onNavigate={vi.fn()} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Hiểu từng chiếc lá Giữ trọn mùa xanh' }),
    ).toBeVisible();
    const lines = container.querySelectorAll('h1 textPath');
    expect(Array.from(lines, (line) => line.textContent)).toEqual([
      'Hiểu từng chiếc lá',
      'Giữ trọn mùa xanh',
    ]);
  });

  it('presents one crop landscape and clear leaf-classification copy', () => {
    const view = render(<HomeLandingHero onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Hiểu từng chiếc lá Giữ trọn mùa xanh',
    );
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Người hái chè giữa những luống chè trên đồi',
    );
    expect(screen.queryByText('Phân loại bệnh lá cây từ ảnh')).toBeNull();
    expect(
      screen.queryByText(
        'Chọn một ảnh lá rõ nét để phân loại và đối chiếu với thông tin bệnh thường gặp.',
      ),
    ).toBeNull();
    expect(screen.queryByText('Chụp rõ bề mặt lá, giữ cả phần có dấu hiệu bất thường.')).toBeNull();
    expect(
      view.container.querySelector(
        'canvas, [data-home-rail], [data-home-watermark], [data-home-foliage]',
      ),
    ).toBeNull();
  });

  it('opens the existing diagnosis and disease-reference flows', async () => {
    const navigate = vi.fn();
    render(<HomeLandingHero onNavigate={navigate} />);
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra lá' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tra cứu bệnh' }));
    expect(navigate.mock.calls).toEqual([['diagnose'], ['diseases']]);
  });
});

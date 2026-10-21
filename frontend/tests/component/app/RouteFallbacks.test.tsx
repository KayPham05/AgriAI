import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ErrorPage from '@/app/error';
import NotFound from '@/app/not-found';

const navigation = vi.hoisted(() => ({ back: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => navigation }));

describe('route fallbacks', () => {
  it('offers retry without revealing an internal exception', async () => {
    const retry = vi.fn();
    render(
      <ErrorPage error={new Error('Internal database host and private payload')} retry={retry} />,
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('Internal database host');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it('offers a real return link on an unknown page', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/');
  });
  it('returns to the previous page when browsing history exists', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(2);
    render(<NotFound />);
    await userEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    expect(navigation.back).toHaveBeenCalledOnce();
  });
  it('falls back to the public home for a newly opened invalid link', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    render(<NotFound />);
    await userEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    expect(navigation.replace).toHaveBeenCalledWith('/');
  });
});

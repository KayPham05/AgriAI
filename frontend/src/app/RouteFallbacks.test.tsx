import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ErrorPage from './error';
import NotFound from './not-found';

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
    expect(screen.getByRole('link', { name: 'Về AgriAI' })).toHaveAttribute('href', '/');
  });
});

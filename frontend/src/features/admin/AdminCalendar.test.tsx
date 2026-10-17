import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AdminCalendar } from './AdminCalendar';

describe('Admin monthly calendar', () => {
  it('shows the whole leap month and marks today', () => {
    render(<AdminCalendar today="2028-02-29" />);
    expect(screen.getByRole('heading', { name: 'Tháng 2, 2028' })).toBeVisible();
    expect(screen.getByRole('table', { name: 'Tháng 2, 2028' })).toBeVisible();
    expect(screen.getByText('29', { selector: '[aria-current="date"]' })).toBeVisible();
    expect(screen.queryByText('30', { selector: 'time' })).toBeNull();
  });

  it('navigates across year boundaries and returns to today', async () => {
    render(<AdminCalendar today="2026-01-15" />);
    await userEvent.click(screen.getByRole('button', { name: 'Tháng trước' }));
    expect(screen.getByRole('heading', { name: 'Tháng 12, 2025' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Tháng sau' }));
    expect(screen.getByRole('heading', { name: 'Tháng 1, 2026' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Tháng sau' }));
    await userEvent.click(screen.getByRole('button', { name: 'Về tháng hiện tại' }));
    expect(screen.getByText('15', { selector: '[aria-current="date"]' })).toBeVisible();
  });
});

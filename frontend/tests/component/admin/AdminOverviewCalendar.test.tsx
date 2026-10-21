import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminOverviewCalendar } from '@/features/admin/AdminOverviewCalendar';

function setupMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const media = {
    matches,
    media: '(min-width: 1024px) and (min-height: 900px)',
    onchange: null,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  };
  vi.stubGlobal('matchMedia', () => media);
  return {
    resize(next: boolean) {
      act(() => {
        media.matches = next;
        listeners.forEach((listener) => {
          listener();
        });
      });
    },
    listeners,
  };
}

describe('responsive overview calendar', () => {
  it('opens on roomy screens and collapses when the available height becomes small', () => {
    const media = setupMedia(true);
    const view = render(<AdminOverviewCalendar />);
    expect(screen.getByRole('region', { name: 'Lịch tháng' })).toBeVisible();
    media.resize(false);
    expect(screen.getByRole('region', { name: 'Lịch tháng' })).not.toBeVisible();
    media.resize(true);
    expect(screen.getByRole('region', { name: 'Lịch tháng' })).toBeVisible();
    view.unmount();
    expect(media.listeners.size).toBe(0);
  });

  it('preserves an explicit calendar choice across responsive changes and rerenders', async () => {
    const media = setupMedia(false);
    const view = render(<AdminOverviewCalendar />);
    expect(screen.getByRole('region', { name: 'Lịch tháng' })).not.toBeVisible();
    await userEvent.click(screen.getByText('Lịch tháng', { selector: 'summary' }));
    expect(screen.getByRole('region', { name: 'Lịch tháng' })).toBeVisible();
    media.resize(true);
    await userEvent.click(screen.getByText('Lịch tháng', { selector: 'summary' }));
    media.resize(false);
    media.resize(true);
    view.rerender(<AdminOverviewCalendar />);
    expect(screen.getByRole('region', { name: 'Lịch tháng' })).not.toBeVisible();
  });

  it('stays usable when matchMedia is unavailable', async () => {
    vi.stubGlobal('matchMedia', undefined);
    render(<AdminOverviewCalendar />);
    await userEvent.click(screen.getByText('Lịch tháng', { selector: 'summary' }));
    expect(screen.getByRole('region', { name: 'Lịch tháng' })).toBeVisible();
  });
});

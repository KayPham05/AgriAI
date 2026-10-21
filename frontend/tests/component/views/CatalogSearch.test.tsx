import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_DISEASES, SUPPORTED_PLANTS } from '@/data/plantData';
import { PlantsPage } from '@/views/PlantsPage';
import { DiseasesPage } from '@/views/DiseasesPage';
import { HistoryPage } from '@/views/HistoryPage';
import { successfulPrediction } from '../../helpers/prediction';

const cases = [
  {
    name: 'plants',
    render: () => (
      <PlantsPage plants={SUPPORTED_PLANTS} onSelectPlant={vi.fn()} onDiagnosePlant={vi.fn()} />
    ),
  },
  {
    name: 'diseases',
    render: () => (
      <DiseasesPage
        diseases={ALL_DISEASES}
        onSelectDisease={vi.fn()}
        onDiagnoseDiseasePlant={vi.fn()}
      />
    ),
  },
  {
    name: 'saved samples',
    render: () => (
      <HistoryPage
        history={[successfulPrediction.diagnosis]}
        onSelectResult={vi.fn()}
        onDeleteResult={vi.fn()}
        onNavigateDiagnose={vi.fn()}
      />
    ),
  },
];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe.each(cases)('$name automatic search', ({ render: view }) => {
  it('waits 500 ms after the last edit and clears immediately', () => {
    render(view());
    const count = screen.getAllByRole('article').length;
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'no-match' } });
    expect(input).toHaveValue('no-match');
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getAllByRole('article')).toHaveLength(count);
    fireEvent.change(input, { target: { value: 'no-match-final' } });
    act(() => vi.advanceTimersByTime(499));
    expect(screen.getAllByRole('article')).toHaveLength(count);
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getAllByRole('article')).toHaveLength(count);
  });

  it('applies Enter immediately and cancels a pending query when cleared', () => {
    render(view());
    const count = screen.getAllByRole('article').length;
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'no-match' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(screen.getAllByRole('article')).toHaveLength(count);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.change(input, { target: { value: 'another-no-match' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xóa từ khóa' }));
    act(() => vi.advanceTimersByTime(500));
    expect(input).toHaveValue('');
    expect(screen.getAllByRole('article')).toHaveLength(count);
  });
});

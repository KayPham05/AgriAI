import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ALL_DISEASES, SUPPORTED_PLANTS } from '../data/plantData';
import { DiseaseDetailPage } from './DiseaseDetailPage';
import { DiseasesPage } from './DiseasesPage';
import { PlantDetailPage } from './PlantDetailPage';

describe('catalog image integrity', () => {
  it('does not publish the unverified stock-photo URLs as disease examples', () => {
    const images = [
      ...ALL_DISEASES.map((disease) => disease.heroImage),
      ...SUPPORTED_PLANTS.flatMap((plant) =>
        plant.conditions.map((condition) => condition.imageUrl),
      ),
    ];
    expect(images.filter((source) => source?.includes('images.unsplash.com'))).toEqual([]);
  });

  it('shows an honest missing-image state and keeps catalog navigation available', () => {
    render(
      <DiseasesPage
        diseases={[{ ...ALL_DISEASES[0], heroImage: '' }]}
        onSelectDisease={vi.fn()}
        onDiagnoseDiseasePlant={vi.fn()}
      />,
    );
    expect(screen.getByText('Chưa có ảnh đối chiếu')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xem chi tiết/ })).toBeEnabled();
  });

  it('replaces a failed disease image with readable fallback content', () => {
    render(
      <DiseaseDetailPage
        disease={{ ...ALL_DISEASES[0], heroImage: '/images/missing-reference.jpg' }}
        onBack={vi.fn()}
        onDiagnosePlant={vi.fn()}
      />,
    );
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('Chưa có ảnh đối chiếu')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('explains missing condition photography in the plant detail', () => {
    const plant = {
      ...SUPPORTED_PLANTS[0],
      conditions: [{ ...SUPPORTED_PLANTS[0].conditions[0], imageUrl: undefined }],
    };
    render(
      <PlantDetailPage
        plant={plant}
        onBack={vi.fn()}
        onSelectDisease={vi.fn()}
        onDiagnosePlant={vi.fn()}
      />,
    );
    expect(screen.getByText('Chưa có ảnh đối chiếu')).toBeVisible();
    expect(screen.getByRole('heading', { name: plant.conditions[0].name })).toBeVisible();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/providers/AppContexts';
import { HistoryPage } from '@/views/HistoryPage';
import type { DiagnosisResult } from '@/types';

const path =
  '/api/predictions/11111111-1111-1111-1111-111111111111/images/22222222-2222-2222-2222-222222222222';
const result: DiagnosisResult = {
  id: 'history-test',
  timestamp: '20/10/2026',
  plant: 'Lúa',
  prediction: 'Khỏe mạnh',
  confidence: 0.95,
  confidenceCategory: 'Độ tin cậy cao',
  top_predictions: [],
  originalImageUrl: path,
  gradcam_url: '',
  severity: null,
  modelVersion: 'convnext-tiny-v1.4',
};

function show(token: string | null) {
  return render(
    <AuthContext.Provider
      value={{
        session: token
          ? {
              token,
              user: {
                id: 'user',
                fullName: 'User',
                email: 'user@test.example',
                role: 'User',
                createdAt: '',
              },
            }
          : null,
        profile: { name: 'User' } as never,
        logout: vi.fn(),
        updateProfile: vi.fn(),
        updateAccount: vi.fn(),
        openAuthentication: vi.fn(),
      }}
    >
      <HistoryPage
        history={[result]}
        onSelectResult={vi.fn()}
        onDeleteResult={vi.fn()}
        onNavigateDiagnose={vi.fn()}
      />
    </AuthContext.Provider>,
  );
}

describe('private history image', () => {
  it('loads owner image with JWT and revokes the blob on unmount', async () => {
    const request = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['image'], { type: 'image/png' }),
      });
    vi.stubGlobal('fetch', request);
    const page = show('test-token');
    await waitFor(() =>
      expect(screen.getByAltText('Khỏe mạnh')).toHaveAttribute('src', 'blob:leaf-preview'),
    );
    expect(request).toHaveBeenCalledWith(
      path,
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
        cache: 'no-store',
      }),
    );
    page.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:leaf-preview');
  });

  it('does not request a protected image without a session', () => {
    const request = vi.fn();
    vi.stubGlobal('fetch', request);
    show(null);
    expect(request).not.toHaveBeenCalled();
    expect(screen.queryByAltText('Khỏe mạnh')).not.toBeInTheDocument();
  });

  it('keeps the result readable when the image is expired or unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    show('test-token');
    expect(await screen.findByText('Ảnh không còn khả dụng')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Khỏe mạnh' })).toBeVisible();
  });
});

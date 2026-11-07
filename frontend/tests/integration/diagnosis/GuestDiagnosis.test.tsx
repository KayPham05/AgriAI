import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readGuestPredictionDraft,
  writeGuestPredictionDraft,
} from '@/features/diagnosis/guestPredictionDraft';
import {
  createPrediction,
  readGuestPredictionImage,
  saveGuestPrediction,
} from '@/services/predictionApi';
import { DiagnosePage } from '@/views/DiagnosePage';
import { successfulPrediction } from '../../helpers/prediction';

vi.mock('@/services/predictionApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/predictionApi')>()),
  createPrediction: vi.fn(),
  readGuestPredictionImage: vi.fn(),
  saveGuestPrediction: vi.fn(),
}));

const guestResult = {
  ...successfulPrediction,
  dto: { ...successfulPrediction.dto, guestToken: 'A'.repeat(64) },
};

describe('guest diagnosis and account save', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.mocked(createPrediction).mockReset().mockResolvedValue(guestResult);
    vi.mocked(readGuestPredictionImage)
      .mockReset()
      .mockResolvedValue(new Blob(['original-leaf'], { type: 'image/jpeg' }));
    vi.mocked(saveGuestPrediction).mockReset().mockResolvedValue(successfulPrediction);
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        naturalWidth = 800;
        naturalHeight = 600;
        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
  });
  afterEach(() => sessionStorage.clear());

  it('runs anonymously, retains the tab result, and saves it only after requested login', async () => {
    const onPredictionCreated = vi.fn();
    const onRequestLogin = vi.fn();
    const props = { onPredictionCreated, onRequestLogin };
    const view = render(<DiagnosePage {...props} />);
    await userEvent.upload(
      screen.getByLabelText(/Chọn ảnh lá cây/i),
      new File(['leaf'], 'leaf.jpg', { type: 'image/jpeg' }),
    );
    await screen.findByRole('img', { name: 'Ảnh xem trước: leaf.jpg' });
    await userEvent.click(screen.getByRole('button', { name: 'Phân tích ngay' }));
    expect(await screen.findByRole('heading', { name: 'Bệnh cháy lá sớm' })).toBeVisible();
    expect(createPrediction).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({ token: undefined }),
    );
    expect(readGuestPredictionDraft()?.saveRequested).toBe(false);
    expect(localStorage.getItem('agriai_guest_prediction')).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu kết quả vào tài khoản' }));
    expect(onRequestLogin).toHaveBeenCalledOnce();
    expect(saveGuestPrediction).not.toHaveBeenCalled();
    // Closing login without a session leaves the result available.
    view.rerender(<DiagnosePage {...props} />);
    expect(screen.getByRole('heading', { name: 'Bệnh cháy lá sớm' })).toBeVisible();
    expect(readGuestPredictionDraft()?.saveRequested).toBe(true);
    view.rerender(<DiagnosePage {...props} authToken="owner-token" />);
    expect(await screen.findByText('Đã lưu kết quả vào lịch sử tài khoản.')).toBeVisible();
    expect(saveGuestPrediction).toHaveBeenCalledExactlyOnceWith('A'.repeat(64), 'owner-token');
    expect(createPrediction).toHaveBeenCalledOnce();
    expect(readGuestPredictionDraft()).toBeNull();
    expect(onPredictionCreated).toHaveBeenLastCalledWith(successfulPrediction.diagnosis);
  });

  it('restores the result and preview on reload without inference or automatic account save', async () => {
    writeGuestPredictionDraft(guestResult);
    render(<DiagnosePage authToken="owner-token" onPredictionCreated={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Bệnh cháy lá sớm' })).toBeVisible();
    await waitFor(() => expect(screen.getByRole('img', { name: /Ảnh xem trước/ })).toBeVisible());
    expect(readGuestPredictionImage).toHaveBeenCalledWith('A'.repeat(64), expect.any(AbortSignal));
    expect(createPrediction).not.toHaveBeenCalled();
    expect(saveGuestPrediction).not.toHaveBeenCalled();
  });

  it('keeps a failed save retryable without rerunning AI or silently losing the draft', async () => {
    writeGuestPredictionDraft(guestResult, true);
    vi.mocked(saveGuestPrediction).mockRejectedValueOnce(new Error('Lưu tạm thời thất bại'));
    render(<DiagnosePage authToken="owner-token" onPredictionCreated={vi.fn()} />);
    expect(await screen.findByText('Lưu tạm thời thất bại')).toBeVisible();
    expect(readGuestPredictionDraft()?.result.dto.guestToken).toBe('A'.repeat(64));
    expect(readGuestPredictionDraft()?.saveRequested).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu kết quả vào tài khoản' }));
    expect(await screen.findByText('Đã lưu kết quả vào lịch sử tài khoản.')).toBeVisible();
    expect(saveGuestPrediction).toHaveBeenCalledTimes(2);
    expect(createPrediction).not.toHaveBeenCalled();
    expect(readGuestPredictionDraft()).toBeNull();
  });

  it('keeps the diagnosis visible if the temporary image has expired', async () => {
    writeGuestPredictionDraft(guestResult);
    vi.mocked(readGuestPredictionImage).mockRejectedValue(new Error('Ảnh tạm đã hết hạn'));
    render(<DiagnosePage onPredictionCreated={vi.fn()} />);
    expect(await screen.findByText('Ảnh tạm đã hết hạn')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Bệnh cháy lá sớm' })).toBeVisible();
    expect(createPrediction).not.toHaveBeenCalled();
  });

  it('does not restore an old preview after the user selects a new image', async () => {
    writeGuestPredictionDraft(guestResult);
    let finishPreview!: (blob: Blob) => void;
    vi.mocked(readGuestPredictionImage).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPreview = resolve;
        }),
    );
    render(<DiagnosePage onPredictionCreated={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Bệnh cháy lá sớm' });
    await userEvent.upload(
      screen.getByLabelText(/Chọn ảnh lá cây/i),
      new File(['new'], 'new.jpg', { type: 'image/jpeg' }),
    );
    await screen.findByRole('img', { name: 'Ảnh xem trước: new.jpg' });
    await act(async () => finishPreview(new Blob(['old'], { type: 'image/jpeg' })));
    expect(screen.getByRole('img', { name: 'Ảnh xem trước: new.jpg' })).toBeVisible();
    expect(readGuestPredictionDraft()).toBeNull();
  });
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CameraCaptureModal } from './CameraCaptureModal';

function mockCamera(getUserMedia: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
}

describe('CameraCaptureModal', () => {
  it('retries after permission failure and makes capture available when the new stream is ready', async () => {
    const user = userEvent.setup();
    const stream = { getTracks: () => [{ stop: vi.fn() }] };
    mockCamera(
      vi.fn().mockRejectedValueOnce(new Error('Permission denied')).mockResolvedValueOnce(stream),
    );
    render(<CameraCaptureModal isOpen onClose={vi.fn()} onCapture={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Thử lại máy ảnh' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Hình ảnh trực tiếp từ máy ảnh')).toHaveProperty(
        'srcObject',
        stream,
      ),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.loadedData(screen.getByLabelText('Hình ảnh trực tiếp từ máy ảnh'));
    expect(screen.getByRole('button', { name: 'Chụp ảnh lá' })).toBeEnabled();
  });

  it('stops the active camera when the dialog closes', async () => {
    const stop = vi.fn();
    mockCamera(vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }));
    const props = { onClose: vi.fn(), onCapture: vi.fn() };
    const { rerender } = render(<CameraCaptureModal isOpen {...props} />);
    expect(screen.getByRole('button', { name: 'Chụp ảnh lá' })).toBeDisabled();
    await waitFor(() => expect(document.querySelector('video')?.srcObject).toBeTruthy());
    fireEvent.loadedData(screen.getByLabelText('Hình ảnh trực tiếp từ máy ảnh'));
    expect(screen.getByRole('button', { name: 'Chụp ảnh lá' })).toBeEnabled();
    rerender(<CameraCaptureModal isOpen={false} {...props} />);
    expect(stop).toHaveBeenCalledOnce();
  });

  it('stops a stream whose permission resolves after closing', async () => {
    const stop = vi.fn();
    let resolveCamera!: (value: unknown) => void;
    mockCamera(
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveCamera = resolve;
          }),
      ),
    );
    const { unmount } = render(<CameraCaptureModal isOpen onClose={vi.fn()} onCapture={vi.fn()} />);
    unmount();
    await act(async () => resolveCamera({ getTracks: () => [{ stop }] }));
    expect(stop).toHaveBeenCalledOnce();
  });

  it('explains permission failure and keeps capture disabled', async () => {
    mockCamera(vi.fn().mockRejectedValue(new Error('Permission denied')));
    render(<CameraCaptureModal isOpen onClose={vi.fn()} onCapture={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể mở máy ảnh');
    expect(screen.getByRole('button', { name: 'Chụp ảnh lá' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Thử lại máy ảnh' })).toBeEnabled();
  });
});

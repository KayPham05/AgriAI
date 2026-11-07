import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CatalogImageEditor } from '@/features/knowledge/CatalogImageEditor';

function renderEditor(overrides: Partial<ComponentProps<typeof CatalogImageEditor>> = {}) {
  const props = {
    kind: 'plants' as const,
    record: { id: 'p', isActive: true, createdAt: '' },
    token: 'admin',
    disabled: false,
    onChange: vi.fn(),
    onBusyChange: vi.fn(),
    onDirtyChange: vi.fn(),
    ...overrides,
  };
  return { ...render(<CatalogImageEditor {...props} />), props };
}

describe('catalog image editor', () => {
  it('requires a saved catalog record before offering image upload', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    renderEditor({ record: { id: '', isActive: true, createdAt: '' } });

    expect(
      screen.getByText('Lưu nội dung để tạo mục mới, sau đó tải ảnh lên tại đây.'),
    ).toBeVisible();
    expect(screen.queryByLabelText('Chọn ảnh cây trồng')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', new File([], 'empty.png', { type: 'image/png' })],
    ['unsupported type', new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' })],
    [
      'over 5 MiB',
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
    ],
  ])('rejects an %s file without sending a request', (_label, file) => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { props } = renderEditor();
    fireEvent.change(screen.getByLabelText('Chọn ảnh cây trồng'), { target: { files: [file] } });

    expect(screen.getByRole('alert')).toHaveTextContent('Chọn ảnh JPG hoặc PNG không quá 5 MB.');
    expect(screen.getByRole('button', { name: 'Lưu ảnh' })).toBeDisabled();
    expect(props.onDirtyChange).toHaveBeenLastCalledWith(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts a JPEG at the size limit and discards its preview without uploading', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { props } = renderEditor();
    const file = new File([new Uint8Array(5 * 1024 * 1024)], 'plant.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText('Chọn ảnh cây trồng'), file);
    expect(screen.getByRole('button', { name: 'Lưu ảnh' })).toBeEnabled();
    expect(props.onDirtyChange).toHaveBeenLastCalledWith(true);
    const preview = (await screen.findByAltText('Xem trước ảnh đã chọn')).getAttribute('src');

    await userEvent.click(screen.getByRole('button', { name: 'Bỏ chọn' }));

    expect(screen.queryByAltText('Xem trước ảnh đã chọn')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Chọn ảnh cây trồng')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Lưu ảnh' })).toBeDisabled();
    expect(props.onDirtyChange).toHaveBeenLastCalledWith(false);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(preview);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('disables file selection while the parent form is saving', () => {
    renderEditor({ disabled: true });
    expect(screen.getByLabelText('Chọn ảnh cây trồng')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lưu ảnh' })).toBeDisabled();
  });

  it('loads saved images with Admin credentials and removes them only after confirmation', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(new Blob(['image'], { type: 'image/png' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    const { props } = renderEditor({
      record: {
        id: 'p',
        isActive: false,
        createdAt: '',
        imageUrl: '/api/catalog/plants/p/image?v=old.png',
      },
    });
    expect(await screen.findByAltText('Ảnh minh họa đã lưu')).toBeVisible();
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      '/api/catalog/plants/p/image?v=old.png',
      expect.objectContaining({
        headers: { Authorization: 'Bearer admin' },
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Gỡ ảnh đã tải' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Nội dung danh mục được giữ nguyên.');
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(props.onChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Gỡ ảnh đã tải' }));
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() => expect(props.onChange).toHaveBeenCalledWith(null));
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/catalog/plants/p/image',
      expect.objectContaining({
        method: 'DELETE',
        body: undefined,
        headers: expect.objectContaining({ Authorization: 'Bearer admin' }),
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Đã gỡ ảnh tải lên.');
    expect(props.onBusyChange).toHaveBeenCalledTimes(2);
    expect(props.onBusyChange).toHaveBeenNthCalledWith(1, true);
    expect(props.onBusyChange).toHaveBeenNthCalledWith(2, false);
  });

  it('blocks duplicate submissions and aborts an upload when the editor unmounts', async () => {
    let finish!: (response: Response) => void;
    const fetch = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const { unmount, props } = renderEditor();
    await userEvent.upload(
      screen.getByLabelText('Chọn ảnh cây trồng'),
      new File(['image'], 'plant.png', { type: 'image/png' }),
    );
    await userEvent.dblClick(screen.getByRole('button', { name: 'Lưu ảnh' }));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Đang lưu...' })).toBeDisabled();
    expect(screen.getByLabelText('Chọn ảnh cây trồng')).toBeDisabled();
    expect(props.onBusyChange).toHaveBeenCalledWith(true);
    const signal = fetch.mock.calls[0][1].signal as AbortSignal;

    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      finish(new Response(JSON.stringify({ imageUrl: '/api/catalog/plants/p/image?v=new.png' })));
    });
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it('previews an image and submits multipart data only after Save image', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ imageUrl: '/api/catalog/plants/p/image?v=new.png' })),
      );
    vi.stubGlobal('fetch', fetch);
    const changed = vi.fn();
    render(
      <CatalogImageEditor
        kind="plants"
        record={{ id: 'p', isActive: true, createdAt: '' }}
        token="admin"
        disabled={false}
        onChange={changed}
        onBusyChange={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
    );
    const file = new File(['sample'], 'plant.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Chọn ảnh cây trồng'), file);
    expect(fetch).not.toHaveBeenCalled();
    expect(await screen.findByAltText('Xem trước ảnh đã chọn')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu ảnh' }));
    await waitFor(() =>
      expect(changed).toHaveBeenCalledWith('/api/catalog/plants/p/image?v=new.png'),
    );
    const [path, options] = fetch.mock.calls[0];
    expect(path).toBe('/api/catalog/plants/p/image');
    expect(options.method).toBe('PUT');
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get('file')).toBe(file);
    expect(options.headers.Authorization).toBe('Bearer admin');
    expect(options.headers['Content-Type']).toBeUndefined();
  });

  it('keeps the selected image and retries successfully after a storage failure', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Kho ảnh đang gián đoạn.' }), { status: 503 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ imageUrl: '/api/catalog/diseases/d/image?v=retry.png' })),
      );
    vi.stubGlobal('fetch', fetch);
    const changed = vi.fn();
    render(
      <CatalogImageEditor
        kind="diseases"
        record={{ id: 'd', isActive: true, createdAt: '' }}
        token="admin"
        disabled={false}
        onChange={changed}
        onBusyChange={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
    );
    await userEvent.upload(
      screen.getByLabelText('Chọn ảnh bệnh cây'),
      new File(['sample'], 'disease.png', { type: 'image/png' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Lưu ảnh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Kho ảnh đang gián đoạn.');
    expect(changed).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Lưu ảnh' })).toBeEnabled();
    expect(screen.getByAltText('Xem trước ảnh đã chọn')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu ảnh' }));
    await waitFor(() =>
      expect(changed).toHaveBeenCalledWith('/api/catalog/diseases/d/image?v=retry.png'),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1].body.get('file')).toBe(fetch.mock.calls[0][1].body.get('file'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu ảnh' })).toBeDisabled();
  });
});

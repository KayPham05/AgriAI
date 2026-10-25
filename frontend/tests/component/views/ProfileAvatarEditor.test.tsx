import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileAvatarEditor } from '@/components/profile/ProfileAvatarEditor';
import { MAX_IMAGE_BYTES } from '@/utils/imageFileValidation';

let images: { onload: (() => void) | null; onerror: (() => void) | null }[];

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  images = [];
  // jsdom reads files but does not decode images. Control only that native boundary.
  vi.stubGlobal(
    'Image',
    class {
      naturalWidth = 96;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        images.push(this);
      }
    },
  );
});

function showEditor() {
  const onChange = vi.fn();
  function Harness() {
    const [avatarUrl, setAvatarUrl] = useState('/original-avatar.png');
    return (
      <ProfileAvatarEditor
        name="Nguyễn Minh An"
        avatarUrl={avatarUrl}
        onChange={(url) => {
          onChange(url);
          setAvatarUrl(url);
        }}
      />
    );
  }
  return { ...render(<Harness />), onChange };
}

describe('ProfileAvatarEditor', () => {
  it('uploads only after confirmation and keeps the preview available after a server error', async () => {
    const onChange = vi.fn();
    const onUpload = vi
      .fn()
      .mockRejectedValueOnce(new Error('Không thể lưu ảnh.'))
      .mockResolvedValueOnce(undefined);
    render(
      <ProfileAvatarEditor name="Tài khoản" avatarUrl="" onChange={onChange} onUpload={onUpload} />,
    );
    const file = new File(['portrait'], 'portrait.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Chọn ảnh đại diện'), file);
    await waitFor(() => expect(images).toHaveLength(1));
    act(() => images[0].onload?.());
    expect(onUpload).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu ảnh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể lưu ảnh.');
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu ảnh' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onUpload).toHaveBeenLastCalledWith(file, expect.any(AbortSignal));
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu ảnh đại diện vào tài khoản.');
  });
  it('leaves the current avatar unchanged when the file picker is cancelled', () => {
    const { onChange } = showEditor();
    fireEvent.change(screen.getByLabelText('Chọn ảnh đại diện'), { target: { files: [] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/original-avatar.png');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đổi ảnh đại diện' })).toBeEnabled();
  });

  it('previews a decoded image and replaces the avatar only after saving', async () => {
    const { onChange } = showEditor();
    const input = screen.getByLabelText('Chọn ảnh đại diện');
    await userEvent.upload(input, new File(['portrait'], 'portrait.png', { type: 'image/png' }));
    expect(screen.getByRole('button', { name: 'Đang đọc ảnh' })).toBeDisabled();
    await waitFor(() => expect(images).toHaveLength(1));
    expect(onChange).not.toHaveBeenCalled();
    act(() => images[0].onload?.());
    expect(screen.getByRole('dialog', { name: 'Lưu ảnh đại diện mới?' })).toBeVisible();
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu ảnh' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('data:image/png;base64,cG9ydHJhaXQ=');
    expect(screen.getByRole('img', { name: 'Ảnh đại diện của Nguyễn Minh An' })).toHaveAttribute(
      'src',
      'data:image/png;base64,cG9ydHJhaXQ=',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Đã đổi ảnh đại diện trong phiên này.');
    expect(input).toHaveValue('');
  });

  it.each([
    [
      'unsupported',
      new File(['text'], 'portrait.svg', { type: 'image/svg+xml' }),
      'Chỉ hỗ trợ ảnh JPG hoặc PNG.',
    ],
    ['empty', new File([], 'empty.png', { type: 'image/png' }), 'Tệp ảnh trống.'],
    [
      'oversized',
      new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'large.jpg', { type: 'image/jpeg' }),
      '15 MB',
    ],
  ])('rejects %s files without replacing the current avatar', (_label, file, message) => {
    const { onChange } = showEditor();
    fireEvent.change(screen.getByLabelText('Chọn ảnh đại diện'), { target: { files: [file] } });
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/original-avatar.png');
  });

  it('keeps the old avatar after a decoding failure and allows selecting the same file again', async () => {
    const { onChange } = showEditor();
    const input = screen.getByLabelText('Chọn ảnh đại diện');
    const file = new File(['broken'], 'broken.jpg', { type: 'image/jpeg' });
    await userEvent.upload(input, file);
    await waitFor(() => expect(images).toHaveLength(1));
    act(() => images[0].onerror?.());
    expect(screen.getByRole('alert')).toHaveTextContent('Không đọc được ảnh');
    expect(screen.getByRole('img')).toHaveAttribute('src', '/original-avatar.png');
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.upload(input, file);
    await waitFor(() => expect(images).toHaveLength(2));
    act(() => images[1].onload?.());
    await userEvent.click(screen.getByRole('button', { name: 'Lưu ảnh' }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not update a profile after the editor unmounts during decoding', async () => {
    const { onChange, unmount } = showEditor();
    await userEvent.upload(
      screen.getByLabelText('Chọn ảnh đại diện'),
      new File(['image'], 'leaf.png', { type: 'image/png' }),
    );
    await waitFor(() => expect(images).toHaveLength(1));
    unmount();
    act(() => images[0].onload?.());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses the latest profile callback if details change while the image is decoding', async () => {
    const previousChange = vi.fn();
    const latestChange = vi.fn();
    const { rerender } = render(
      <ProfileAvatarEditor name="Tên cũ" avatarUrl="" onChange={previousChange} />,
    );
    await userEvent.upload(
      screen.getByLabelText('Chọn ảnh đại diện'),
      new File(['image'], 'leaf.png', { type: 'image/png' }),
    );
    await waitFor(() => expect(images).toHaveLength(1));
    rerender(<ProfileAvatarEditor name="Tên mới" avatarUrl="" onChange={latestChange} />);
    act(() => images[0].onload?.());
    await userEvent.click(screen.getByRole('button', { name: 'Lưu ảnh' }));
    expect(previousChange).not.toHaveBeenCalled();
    expect(latestChange).toHaveBeenCalledExactlyOnceWith('data:image/png;base64,aW1hZ2U=');
  });

  it('keeps the current avatar if file reading fails', async () => {
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      this.dispatchEvent(new Event('error'));
    });
    const { onChange } = showEditor();
    await userEvent.upload(
      screen.getByLabelText('Chọn ảnh đại diện'),
      new File(['image'], 'leaf.png', { type: 'image/png' }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Không đọc được ảnh');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/original-avatar.png');
  });

  it.each(['Không lưu', 'Escape'])(
    'discards the draft with %s without changing the avatar',
    async (action) => {
      const { onChange } = showEditor();
      await userEvent.upload(
        screen.getByLabelText('Chọn ảnh đại diện'),
        new File(['new'], 'new.png', { type: 'image/png' }),
      );
      await waitFor(() => expect(images).toHaveLength(1));
      act(() => images[0].onload?.());
      expect(screen.getByRole('dialog')).toBeVisible();
      if (action === 'Escape') await userEvent.keyboard('{Escape}');
      else await userEvent.click(screen.getByRole('button', { name: action }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('src', '/original-avatar.png');
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Đổi ảnh đại diện' })).toHaveFocus();
    },
  );

  it('allows replacing the preview and saves only the final selected image', async () => {
    const { onChange } = showEditor();
    const input = screen.getByLabelText('Chọn ảnh đại diện');
    await userEvent.upload(input, new File(['first'], 'first.png', { type: 'image/png' }));
    await waitFor(() => expect(images).toHaveLength(1));
    act(() => images[0].onload?.());
    expect(screen.getByRole('button', { name: 'Chọn ảnh khác' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Chọn ảnh khác' }));
    // A native file chooser emits change; the modal blocks direct clicks behind it.
    fireEvent.change(input, {
      target: { files: [new File(['second'], 'second.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(images).toHaveLength(2));
    expect(screen.getByRole('button', { name: 'Lưu ảnh' })).toBeDisabled();
    act(() => images[1].onload?.());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('img', { name: 'Xem trước ảnh đại diện mới' })).toHaveAttribute(
      'src',
      'data:image/png;base64,c2Vjb25k',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Lưu ảnh' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('data:image/png;base64,c2Vjb25k');
  });
});

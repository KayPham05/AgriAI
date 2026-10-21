import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPrediction,
  PredictionApiError,
  type PredictionResponse,
} from '@/services/predictionApi';
import { MAX_IMAGE_BYTES } from '@/utils/imageFileValidation';
import { DiagnosePage } from '@/views/DiagnosePage';
import { successfulPrediction } from '../../helpers/prediction';

vi.mock('@/services/predictionApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/predictionApi')>();
  return { ...actual, createPrediction: vi.fn() };
});

class SuccessfulImage {
  onload: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  naturalWidth = 1200;
  naturalHeight = 800;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.(new Event('load')));
  }
}

function renderDiagnosePage(onPredictionCreated = vi.fn()) {
  render(<DiagnosePage authToken="jwt-token" onPredictionCreated={onPredictionCreated} />);
  return {
    fileInput: screen.getByLabelText(/Chọn ảnh lá cây/i) as HTMLInputElement,
    onPredictionCreated,
  };
}

async function uploadValidImage(fileInput: HTMLInputElement, fileName = 'leaf.jpg') {
  const imageFile = new File(['valid-leaf-image'], fileName, { type: 'image/jpeg' });
  await userEvent.upload(fileInput, imageFile);
  await screen.findByRole('img', { name: new RegExp(`Ảnh xem trước: ${fileName}`, 'i') });
  return imageFile;
}

describe('DiagnosePage prediction flow', () => {
  it('decodes an explicitly selected sample without automatically running inference', async () => {
    const fetchSample = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['sample-leaf'], { type: 'image/jpeg' }),
    });
    vi.stubGlobal('fetch', fetchSample);
    renderDiagnosePage();
    await userEvent.click(screen.getByRole('button', { name: 'Chọn mẫu thử' }));
    expect(await screen.findByRole('img', { name: 'Ảnh xem trước: anh-la-mau.jpg' })).toBeVisible();
    expect(screen.getByText(/Ảnh mẫu minh họa từ cẩm nang/)).toBeVisible();
    expect(createPrediction).not.toHaveBeenCalled();
  });

  it('blocks corrupted images in the input column and releases the object URL', async () => {
    vi.stubGlobal(
      'Image',
      class extends SuccessfulImage {
        set src(_value: string) {
          queueMicrotask(() => this.onerror?.(new Event('error')));
        }
      },
    );
    const { fileInput } = renderDiagnosePage();
    await userEvent.upload(fileInput, new File(['broken'], 'broken.jpg', { type: 'image/jpeg' }));
    const alert = await screen.findByRole('alert');
    expect(screen.getByRole('region', { name: 'Tải ảnh lên' })).toContainElement(alert);
    expect(createPrediction).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:leaf-preview');
  });
  it('blocks low-resolution images in the upload column before any API request', async () => {
    vi.stubGlobal(
      'Image',
      class extends SuccessfulImage {
        naturalWidth = 223;
      },
    );
    const { fileInput } = renderDiagnosePage();
    await userEvent.upload(fileInput, new File(['small'], 'small.jpg', { type: 'image/jpeg' }));
    const alert = await screen.findByRole('alert');
    expect(screen.getByRole('region', { name: 'Tải ảnh lên' })).toContainElement(alert);
    expect(alert).toHaveTextContent('224 × 224');
    expect(createPrediction).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Phân tích ngay' })).toBeNull();
  });

  it('maps verified API content codes to a recoverable warning without losing the photo', async () => {
    vi.mocked(createPrediction).mockRejectedValue(
      new PredictionApiError('Quality gate rejected image', 'OBSTRUCTED_LEAF'),
    );
    const { fileInput } = renderDiagnosePage();
    await uploadValidImage(fileInput);
    await userEvent.click(screen.getByRole('button', { name: 'Phân tích ngay' }));
    expect(await screen.findByRole('heading', { name: 'Bề mặt lá bị che khuất' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Ảnh xem trước: leaf.jpg' })).toBeVisible();
    expect(screen.getByText('CẦN KIỂM TRA')).toBeVisible();
    expect(screen.queryByText('ĐÃ HOÀN TẤT')).toBeNull();
  });

  it('gates low confidence results and only reveals a provisional comparison on request', async () => {
    vi.mocked(createPrediction).mockResolvedValue({
      ...successfulPrediction,
      confidence: 0.4,
      diagnosis: {
        ...successfulPrediction.diagnosis,
        confidence: 0.4,
        top_predictions: [{ label: 'Lớp chưa chắc chắn', confidence: 0.4 }],
      },
    });
    const { fileInput } = renderDiagnosePage();
    await uploadValidImage(fileInput);
    await userEvent.click(screen.getByRole('button', { name: 'Phân tích ngay' }));
    expect(await screen.findByRole('heading', { name: 'Độ tin cậy chẩn đoán thấp' })).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Dự đoán Top-3' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Xem tạm bảng đối chiếu Top-3' }));
    expect(screen.getByRole('list', { name: 'Dự đoán Top-3' })).toHaveTextContent('40.0%');
    expect(screen.queryByRole('heading', { name: 'Bệnh cháy lá sớm' })).toBeNull();
    expect(screen.queryByText('ĐÃ HOÀN TẤT')).toBeNull();
  });
  beforeEach(() => {
    vi.stubGlobal('Image', SuccessfulImage);
    vi.mocked(createPrediction).mockReset();
  });

  it('provides a named drop zone with a keyboard alternative and accepts a dropped image', async () => {
    const { fileInput } = renderDiagnosePage();
    const user = userEvent.setup();
    const zone = screen.getByRole('group', { name: 'Chọn hoặc thả ảnh lá' });
    expect(screen.queryByText('Kiểm tra ảnh lá cây')).toBeNull();
    expect(
      screen.queryByText(
        'Chọn một ảnh rõ nét. Bạn sẽ nhận được lớp dự đoán và độ tin cậy để đối chiếu.',
      ),
    ).toBeNull();
    expect(
      screen
        .getByRole('list', { name: 'Tiến trình phân tích' })
        .querySelector('[aria-current="step"]'),
    ).toHaveTextContent('Chọn ảnh');
    const openPicker = vi.spyOn(fileInput, 'click');

    await user.tab();
    expect(screen.getByRole('button', { name: 'Chọn ảnh' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(openPicker).toHaveBeenCalledOnce();

    fireEvent.drop(zone, {
      dataTransfer: { files: [new File(['leaf'], 'dropped.jpg', { type: 'image/jpeg' })] },
    });
    expect(
      await screen.findByRole('img', { name: 'Ảnh xem trước: dropped.jpg' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Phân tích ngay$/i })).toBeEnabled();
  });

  it('shows an image preview, supports replacing it, and returns to idle after removal', async () => {
    // Arrange
    const { fileInput } = renderDiagnosePage();

    // Act
    await uploadValidImage(fileInput, 'first-leaf.jpg');

    // Assert
    expect(screen.getByText('first-leaf.jpg')).toBeInTheDocument();
    expect(screen.getByText(/1200 × 800 px/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Phân tích ngay$/i })).toBeEnabled();

    // Act: choose another valid image through the same file input.
    await uploadValidImage(fileInput, 'second-leaf.jpg');

    // Assert
    expect(screen.queryByText('first-leaf.jpg')).not.toBeInTheDocument();
    expect(screen.getByText('second-leaf.jpg')).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalled();

    // Act
    await userEvent.click(screen.getByRole('button', { name: /Xóa ảnh/i }));

    // Assert
    expect(screen.queryByText('second-leaf.jpg')).not.toBeInTheDocument();
    expect(screen.getByText(/Kết quả chẩn đoán sẽ xuất hiện tại đây/i)).toBeInTheDocument();
  });

  it.each([
    [
      'unsupported type',
      new File(['not-an-image'], 'leaf.pdf', { type: 'application/pdf' }),
      /JPG hoặc PNG/i,
    ],
    ['empty image', new File([], 'empty.jpg', { type: 'image/jpeg' }), /Tệp ảnh trống/i],
    [
      'oversized image',
      { name: 'huge.png', type: 'image/png', size: MAX_IMAGE_BYTES + 1 } as File,
      /15 MB/i,
    ],
  ])('shows a safe validation error for an %s', async (_caseName, file, expectedMessage) => {
    // Arrange
    const { fileInput } = renderDiagnosePage();

    // Act
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Assert
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(expectedMessage);
    expect(createPrediction).not.toHaveBeenCalled();
  });

  it('moves through uploading, analyzing, and success while rendering backend data', async () => {
    // Arrange
    const onPredictionCreated = vi.fn();
    let resolvePrediction!: (value: PredictionResponse) => void;
    let requestOptions: Parameters<typeof createPrediction>[1];
    vi.mocked(createPrediction).mockImplementation((_file, options) => {
      requestOptions = options;
      return new Promise((resolve) => {
        resolvePrediction = resolve;
      });
    });
    const { fileInput } = renderDiagnosePage(onPredictionCreated);
    expect(screen.getByText('CHỌN ẢNH')).toBeVisible();
    expect(screen.queryByText('ĐANG THỰC HIỆN')).toBeNull();
    const imageFile = await uploadValidImage(fileInput);
    expect(screen.getByText('ĐANG THỰC HIỆN')).toBeVisible();
    expect(
      screen
        .getByRole('list', { name: 'Tiến trình phân tích' })
        .querySelector('[aria-current="step"]'),
    ).toHaveTextContent('Chọn ảnh lá');

    // Act
    await userEvent.click(screen.getByRole('button', { name: /^Phân tích ngay$/i }));

    // Assert: uploading
    expect(await screen.findByRole('status')).toHaveTextContent(/Đang tải ảnh lên/i);
    expect(
      screen
        .getByRole('list', { name: 'Tiến trình phân tích' })
        .querySelector('[aria-current="step"]'),
    ).toHaveTextContent('Phân tích');
    expect(screen.getByRole('status')).toHaveTextContent('Ảnh đang được tải lên');
    expect(createPrediction).toHaveBeenCalledWith(
      imageFile,
      expect.objectContaining({ token: 'jwt-token' }),
    );

    // Act
    act(() => requestOptions?.onUploadProgress?.(64));
    expect(screen.getByRole('progressbar', { name: 'Tiến độ tải ảnh' })).toHaveAttribute(
      'aria-valuenow',
      '64',
    );
    act(() => requestOptions?.onUploadComplete?.());

    // Assert: analyzing
    expect(screen.getByRole('status')).toHaveTextContent(/Đang phân loại ảnh lá/i);

    expect(screen.getByRole('status')).toHaveTextContent('Đã tải ảnh lên');
    expect(screen.getByRole('status')).toHaveTextContent('Đang đối chiếu lớp dự đoán');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    // Act
    await act(async () => resolvePrediction(successfulPrediction));

    // Assert: success
    expect(await screen.findByRole('heading', { name: 'Bệnh cháy lá sớm' })).toBeInTheDocument();
    expect(screen.queryByText('ĐANG THỰC HIỆN')).toBeNull();
    expect(screen.getByText('ĐÃ HOÀN TẤT')).toBeVisible();
    expect(screen.getAllByLabelText('Đã hoàn thành')).toHaveLength(3);
    expect(screen.getByText('Cà chua')).toBeInTheDocument();
    expect(screen.getAllByText('94.0%')).toHaveLength(2);
    expect(
      screen
        .getByRole('list', { name: 'Tiến trình phân tích' })
        .querySelector('[aria-current="step"]'),
    ).toHaveTextContent('Kết quả');
    expect(screen.getByRole('img', { name: /Ảnh xem trước: leaf.jpg/i })).toHaveAttribute(
      'src',
      'blob:leaf-preview',
    );
    expect(onPredictionCreated).toHaveBeenCalledWith(successfulPrediction.diagnosis);
  });

  it('shows the backend error and successfully retries without losing the selected image', async () => {
    // Arrange
    vi.mocked(createPrediction)
      .mockRejectedValueOnce(new Error('Backend tạm thời không khả dụng.'))
      .mockResolvedValueOnce(successfulPrediction);
    const { fileInput } = renderDiagnosePage();
    await uploadValidImage(fileInput);

    // Act
    await userEvent.click(screen.getByRole('button', { name: /^Phân tích ngay$/i }));

    // Assert: error
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Backend tạm thời không khả dụng.');
    expect(screen.getByText('leaf.jpg')).toBeInTheDocument();

    // Act: retry
    await userEvent.click(screen.getByRole('button', { name: 'Phân tích lại ngay' }));

    // Assert
    expect(await screen.findByRole('heading', { name: 'Bệnh cháy lá sớm' })).toBeInTheDocument();
    expect(createPrediction).toHaveBeenCalledTimes(2);
  });

  it('aborts an in-flight request when the page is unmounted', async () => {
    // Arrange
    let requestSignal: AbortSignal | undefined;
    vi.mocked(createPrediction).mockImplementation((_file, options) => {
      requestSignal = options?.signal;
      return new Promise(() => undefined);
    });
    const onPredictionCreated = vi.fn();
    const { unmount } = render(
      <DiagnosePage authToken="jwt-token" onPredictionCreated={onPredictionCreated} />,
    );
    const fileInput = screen.getByLabelText(/Chọn ảnh lá cây/i) as HTMLInputElement;
    await uploadValidImage(fileInput);
    await userEvent.click(screen.getByRole('button', { name: /^Phân tích ngay$/i }));

    // Act
    unmount();

    // Assert
    expect(requestSignal?.aborted).toBe(true);
    expect(onPredictionCreated).not.toHaveBeenCalled();
  });
});

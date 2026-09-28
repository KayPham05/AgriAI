import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrediction, PredictionResponse } from '../services/predictionApi';
import { MAX_IMAGE_BYTES } from '../utils/imageFileValidation';
import { DiagnosePage } from './DiagnosePage';

vi.mock('../services/predictionApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/predictionApi')>();
  return { ...actual, createPrediction: vi.fn() };
});

const successfulPrediction: PredictionResponse = {
  dto: {
    id: 'prediction-id',
    imagePath: '/uploads/predictions/leaf.jpg',
    imagePublicId: 'leaf-public-id',
    predictedPlantDisease: {
      id: 'plant-disease-id',
      plantId: 'plant-id',
      diseaseId: 'disease-id',
      className: 'Tomato___Early_blight',
      classIndex: 1,
      isActive: true,
      plant: {
        id: 'plant-id',
        name: 'Tomato',
        vietnameseName: 'Cà chua',
        scientificName: 'Solanum lycopersicum',
        description: null,
        isActive: true,
        createdAt: '2026-09-27T10:00:00Z',
      },
      disease: {
        id: 'disease-id',
        name: 'Early Blight',
        vietnameseName: 'Bệnh cháy lá sớm',
        description: null,
        symptoms: null,
        treatment: null,
        prevention: null,
        isActive: true,
        createdAt: '2026-09-27T10:00:00Z',
      },
    },
    confidence: 0.94,
    predictionDetails: [],
    createdAt: '2026-09-27T10:00:00Z',
  },
  diagnosis: {
    id: 'prediction-id',
    timestamp: '27/09/2026 17:00',
    plant: 'Cà chua',
    scientificName: 'Solanum lycopersicum',
    prediction: 'Bệnh cháy lá sớm',
    diseaseId: 'disease-id',
    confidence: 0.94,
    confidenceCategory: 'Độ tin cậy cao',
    top_predictions: [{ label: 'Bệnh cháy lá sớm', confidence: 0.94 }],
    originalImageUrl: '/uploads/predictions/leaf.jpg',
    gradcam_url: '',
    severity: null,
    modelVersion: 'convnext-tiny-backend',
  },
  crop: 'Cà chua',
  disease: 'Bệnh cháy lá sớm',
  confidence: 0.94,
};

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
  beforeEach(() => {
    vi.stubGlobal('Image', SuccessfulImage);
    vi.mocked(createPrediction).mockReset();
  });

  it('shows an image preview, supports replacing it, and returns to idle after removal', async () => {
    // Arrange
    const { fileInput } = renderDiagnosePage();

    // Act
    await uploadValidImage(fileInput, 'first-leaf.jpg');

    // Assert
    expect(screen.getByText('first-leaf.jpg')).toBeInTheDocument();
    expect(screen.getByText(/1200 × 800 px/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Phân tích$/i })).toBeEnabled();

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
    expect(screen.getByText(/Kết quả sẽ xuất hiện tại đây/i)).toBeInTheDocument();
  });

  it.each([
    ['unsupported type', new File(['not-an-image'], 'leaf.pdf', { type: 'application/pdf' }), /JPG hoặc PNG/i],
    ['empty image', new File([], 'empty.jpg', { type: 'image/jpeg' }), /Tệp ảnh trống/i],
    ['oversized image', { name: 'huge.png', type: 'image/png', size: MAX_IMAGE_BYTES + 1 } as File, /15 MB/i],
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
    const imageFile = await uploadValidImage(fileInput);

    // Act
    await userEvent.click(screen.getByRole('button', { name: /^Phân tích$/i }));

    // Assert: uploading
    expect(await screen.findByRole('status')).toHaveTextContent(/Đang tải ảnh lên Backend/i);
    expect(createPrediction).toHaveBeenCalledWith(imageFile, expect.objectContaining({ token: 'jwt-token' }));

    // Act
    act(() => requestOptions?.onUploadProgress?.(64));
    expect(document.querySelector('[style="width: 64%;"]')).toBeInTheDocument();
    act(() => requestOptions?.onUploadComplete?.());

    // Assert: analyzing
    expect(screen.getByRole('status')).toHaveTextContent(/Backend đang xử lý phản hồi/i);

    // Act
    await act(async () => resolvePrediction(successfulPrediction));

    // Assert: success
    expect(await screen.findByText(/Đã nhận kết quả từ backend/i)).toBeInTheDocument();
    expect(screen.getByText('Cà chua')).toBeInTheDocument();
    expect(screen.getByText('Bệnh cháy lá sớm')).toBeInTheDocument();
    expect(screen.getByText('94.0%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Ảnh lá đã phân tích/i })).toHaveAttribute('src', 'blob:leaf-preview');
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
    await userEvent.click(screen.getByRole('button', { name: /^Phân tích$/i }));

    // Assert: error
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Backend tạm thời không khả dụng.');
    expect(screen.getByText('leaf.jpg')).toBeInTheDocument();

    // Act: retry
    await userEvent.click(screen.getByRole('button', { name: /Thử lại/i }));

    // Assert
    expect(await screen.findByText(/Đã nhận kết quả từ backend/i)).toBeInTheDocument();
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
    await userEvent.click(screen.getByRole('button', { name: /^Phân tích$/i }));

    // Act
    unmount();

    // Assert
    expect(requestSignal?.aborted).toBe(true);
    expect(onPredictionCreated).not.toHaveBeenCalled();
  });
});

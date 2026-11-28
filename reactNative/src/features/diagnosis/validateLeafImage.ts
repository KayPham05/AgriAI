import type { SelectedLeafImage } from '@/features/diagnosis/diagnosisDraft';

export const MAX_LEAF_IMAGE_BYTES = 15 * 1024 * 1024;

export type LeafImageValidationError = 'empty-file' | 'too-large' | 'unsupported-heic' | 'unsupported-format';

export type LeafImageValidationResult =
  | { valid: true; formatLabel: 'JPEG' | 'PNG'; sizeLabel: string }
  | { valid: false; error: LeafImageValidationError; message: string };

const JPEG_TYPES = new Set(['image/jpeg', 'image/jpg']);
const PNG_TYPES = new Set(['image/png']);
const HEIC_TYPES = new Set(['image/heic', 'image/heif']);

function formatMiB(bytes?: number): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return 'Không rõ dung lượng';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MiB`;
}

/** Validates baseline JPEG/PNG format and <= 15 MiB limit before upload. */
export function validateLeafImage(image: SelectedLeafImage): LeafImageValidationResult {
  const mime = image.mimeType.trim().toLowerCase();
  const lowerName = image.fileName.trim().toLowerCase();

  if (HEIC_TYPES.has(mime) || lowerName.endsWith('.heic') || lowerName.endsWith('.heif')) {
    return {
      valid: false,
      error: 'unsupported-heic',
      message: 'Ảnh HEIC chưa được chuyển đổi sang JPEG/PNG. Vui lòng chọn ảnh JPEG hoặc PNG.',
    };
  }

  let formatLabel: 'JPEG' | 'PNG' | null = null;
  if (JPEG_TYPES.has(mime) || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) formatLabel = 'JPEG';
  else if (PNG_TYPES.has(mime) || lowerName.endsWith('.png')) formatLabel = 'PNG';

  if (!formatLabel) {
    return {
      valid: false,
      error: 'unsupported-format',
      message: 'Chỉ hỗ trợ ảnh JPEG hoặc PNG.',
    };
  }

  if (typeof image.fileSizeBytes === 'number') {
    if (image.fileSizeBytes <= 0) {
      return {
        valid: false,
        error: 'empty-file',
        message: 'Tệp ảnh trống. Vui lòng chọn lại ảnh khác.',
      };
    }
    if (image.fileSizeBytes > MAX_LEAF_IMAGE_BYTES) {
      return {
        valid: false,
        error: 'too-large',
        message: 'Ảnh vượt quá giới hạn 15 MiB. Vui lòng chọn ảnh khác.',
      };
    }
  }

  return { valid: true, formatLabel, sizeLabel: formatMiB(image.fileSizeBytes) };
}

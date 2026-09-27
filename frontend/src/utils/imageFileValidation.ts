export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

export function getImageFileError(file: Pick<File, 'size' | 'type'>): string | null {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return 'Chỉ hỗ trợ ảnh JPG hoặc PNG. Vui lòng chọn tệp khác.';
  }
  if (file.size === 0) {
    return 'Tệp ảnh trống.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Ảnh vượt quá giới hạn 15 MB.';
  }
  return null;
}

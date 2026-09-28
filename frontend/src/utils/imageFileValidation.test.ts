import { describe, expect, it } from 'vitest';
import { getImageFileError, MAX_IMAGE_BYTES } from './imageFileValidation';

describe('getImageFileError', () => {
  it('accepts a valid JPEG image', () => {
    expect(getImageFileError({ type: 'image/jpeg', size: 1024 })).toBeNull();
  });

  it('accepts a valid PNG image at the size limit', () => {
    expect(getImageFileError({ type: 'image/png', size: MAX_IMAGE_BYTES })).toBeNull();
  });

  it('rejects unsupported file types', () => {
    expect(getImageFileError({ type: 'application/pdf', size: 1024 })).toContain('JPG hoặc PNG');
  });

  it('rejects empty files', () => {
    expect(getImageFileError({ type: 'image/jpeg', size: 0 })).toBe('Tệp ảnh trống.');
  });

  it('rejects images larger than 15 MB', () => {
    expect(getImageFileError({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 })).toContain('15 MB');
  });
});

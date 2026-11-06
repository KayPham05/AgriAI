import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearGuestPredictionDraft,
  readGuestPredictionDraft,
  writeGuestPredictionDraft,
} from '@/features/diagnosis/guestPredictionDraft';
import { successfulPrediction } from '../../helpers/prediction';

const result = {
  ...successfulPrediction,
  dto: { ...successfulPrediction.dto, guestToken: 'token' },
};

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

describe('guest draft storage', () => {
  it('keeps the result and save intent only in session storage and clears both together', () => {
    expect(writeGuestPredictionDraft(result, true)).toBe(true);
    expect(readGuestPredictionDraft()).toEqual({ result, saveRequested: true });
    expect(localStorage.length).toBe(0);
    clearGuestPredictionDraft();
    expect(readGuestPredictionDraft()).toBeNull();
  });

  it.each(['broken json', 'null', '{}', '{"result":{"dto":{}}}'])(
    'ignores a corrupt or incomplete draft: %s',
    (raw) => {
      sessionStorage.setItem('agriai_guest_prediction', raw);
      expect(readGuestPredictionDraft()).toBeNull();
    },
  );

  it('handles unavailable browser storage without breaking diagnosis', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    expect(writeGuestPredictionDraft(result)).toBe(false);
    expect(readGuestPredictionDraft()).toBeNull();
    expect(() => clearGuestPredictionDraft()).not.toThrow();
  });
});

import type { PredictionResponse } from '@/services/predictionApi';

const storageKey = 'agriai_guest_prediction';

export interface GuestPredictionDraft {
  result: PredictionResponse;
  saveRequested: boolean;
}

export function readGuestPredictionDraft(): GuestPredictionDraft | null {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const draft = JSON.parse(raw) as GuestPredictionDraft;
    if (
      !draft.result?.dto?.guestToken ||
      !draft.result.diagnosis ||
      !draft.result.dto.predictedPlantDisease?.plant ||
      !draft.result.dto.predictedPlantDisease?.disease
    )
      return null;
    return { result: draft.result, saveRequested: draft.saveRequested === true };
  } catch {
    return null;
  }
}

export function writeGuestPredictionDraft(
  result: PredictionResponse,
  saveRequested = false,
): boolean {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({ result, saveRequested }));
    return true;
  } catch {
    return false;
  }
}

export function clearGuestPredictionDraft(): void {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // The current result remains usable even when browser storage is unavailable.
  }
}

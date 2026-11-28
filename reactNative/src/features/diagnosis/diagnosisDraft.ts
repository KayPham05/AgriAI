import { createContext, createElement, useContext, useState, type ReactNode } from 'react';

import type { PredictionResult } from '@/features/diagnosis/submitPrediction';

export interface SelectedLeafImage {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
}

interface DiagnosisDraftContextValue {
  draft: SelectedLeafImage | null;
  profileId: string | null;
  lastResult: PredictionResult | null;
  setDraft: (image: SelectedLeafImage) => void;
  setProfileId: (id: string | null) => void;
  setLastResult: (result: PredictionResult | null) => void;
  clearDraft: () => void;
}

const DiagnosisDraftContext = createContext<DiagnosisDraftContextValue | null>(null);

/** Holds a single selected leaf image and transient result in memory across S11->S12->S13->S14. */
export function DiagnosisDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<SelectedLeafImage | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PredictionResult | null>(null);

  function setDraft(image: SelectedLeafImage) {
    setDraftState(image);
  }

  function clearDraft() {
    setDraftState(null);
    setProfileId(null);
    setLastResult(null);
  }

  return createElement(
    DiagnosisDraftContext.Provider,
    { value: { draft, profileId, lastResult, setDraft, setProfileId, setLastResult, clearDraft } },
    children,
  );
}

export function useDiagnosisDraft() {
  const ctx = useContext(DiagnosisDraftContext);
  if (!ctx) throw new Error('DiagnosisDraftProvider is missing');
  return ctx;
}

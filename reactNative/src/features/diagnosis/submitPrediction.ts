export interface PlantDiseaseSummary {
  id: string;
  plantId: string;
  plantName: string;
  plantVietnameseName?: string | null;
  diseaseId: string;
  diseaseName: string;
  diseaseVietnameseName?: string | null;
  description?: string | null;
  symptoms?: string | null;
  careInstructions?: string | null;
  prevention?: string | null;
}

export interface PredictionDetailItem {
  classIndex: number;
  className: string;
  confidence: number;
  plantDisease?: PlantDiseaseSummary | null;
}

export interface RecommendedMedicineItem {
  id: string;
  name: string;
  activeIngredient?: string | null;
  usageInstructions?: string | null;
  warnings?: string | null;
  source?: string | null;
}

export interface PredictionImageItem {
  id: string;
  imagePath?: string | null;
  confidence: number;
  expiresAt: string;
  isExpired: boolean;
}

export interface PredictionResult {
  id: string;
  imagePath: string;
  confidence: number;
  createdAt: string;
  predictedPlantDisease: PlantDiseaseSummary;
  predictionDetails: PredictionDetailItem[];
  images: PredictionImageItem[];
  hasHistoricalSnapshot: boolean;
  warning?: string | null;
  informationPending: boolean;
  medication?: string | null;
  recommendedMedicines: RecommendedMedicineItem[];
  agriculturalProfileId?: string | null;
  guestToken?: string | null;
  guestExpiresAt?: string | null;
}

export type SubmitPredictionResult =
  | { kind: 'succeeded'; result: PredictionResult }
  | { kind: 'unauthorized' }
  | { kind: 'error'; reason: 'network' | 'timeout' | 'service' }
  | { kind: 'cancelled' };

export interface SubmitPredictionDeps {
  uri: string;
  fileName: string;
  mimeType: string;
  isAuthenticated: boolean;
  profileId?: string | null;
  readToken: () => Promise<string | null>;
  request: (url: string, init: RequestInit) => Promise<Pick<Response, 'status' | 'json'>>;
  apiOrigin: string | undefined;
  allowHttp?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const UPLOAD_TIMEOUT_MS = 30_000;

function predictionsEndpoint(apiOrigin: string | undefined, allowHttp: boolean): string | null {
  try {
    const url = new URL(apiOrigin ?? '');
    const supported = url.protocol === 'https:' || (allowHttp && url.protocol === 'http:');
    if (!supported || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      return null;
    }
    return `${url.origin}/api/predictions`;
  } catch {
    return null;
  }
}

/** Uploads one leaf image via multipart/form-data (POST /api/predictions); never auto-retries on timeout. */
export async function submitPrediction(deps: SubmitPredictionDeps): Promise<SubmitPredictionResult> {
  if (deps.signal?.aborted) return { kind: 'cancelled' };
  const url = predictionsEndpoint(deps.apiOrigin, deps.allowHttp === true);
  if (!url) return { kind: 'error', reason: 'service' };

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (deps.isAuthenticated) {
    const token = await deps.readToken();
    if (!token) return { kind: 'unauthorized' };
    headers.Authorization = `Bearer ${token}`;
  }

  const form = new FormData();
  form.append('file', { uri: deps.uri, name: deps.fileName, type: deps.mimeType } as unknown as Blob);
  if (deps.isAuthenticated && deps.profileId) {
    form.append('agriculturalProfileId', deps.profileId);
  }

  const controller = new AbortController();
  const cancel = () => controller.abort();
  deps.signal?.addEventListener('abort', cancel, { once: true });
  const deadline = setTimeout(cancel, deps.timeoutMs ?? UPLOAD_TIMEOUT_MS);
  const aborted = (): SubmitPredictionResult => (
    deps.signal?.aborted ? { kind: 'cancelled' } : { kind: 'error', reason: 'timeout' }
  );

  try {
    let response: Awaited<ReturnType<SubmitPredictionDeps['request']>>;
    try {
      response = await deps.request(url, {
        method: 'POST',
        headers,
        body: form,
        credentials: 'omit',
        redirect: 'error',
        signal: controller.signal,
      });
    } catch {
      return controller.signal.aborted ? aborted() : { kind: 'error', reason: 'network' };
    }

    if (controller.signal.aborted) return aborted();
    if (response.status === 401) return { kind: 'unauthorized' };
    if (response.status !== 200 && response.status !== 201) return { kind: 'error', reason: 'service' };

    const body: unknown = await response.json();
    if (controller.signal.aborted) return aborted();
    if (!body || typeof body !== 'object' || typeof (body as Record<string, unknown>).id !== 'string') {
      return { kind: 'error', reason: 'service' };
    }

    return { kind: 'succeeded', result: body as PredictionResult };
  } catch {
    return controller.signal.aborted ? aborted() : { kind: 'error', reason: 'service' };
  } finally {
    clearTimeout(deadline);
    deps.signal?.removeEventListener('abort', cancel);
  }
}

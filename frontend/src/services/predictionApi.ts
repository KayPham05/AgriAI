export interface PredictionResponse {
  crop: string;
  disease: string;
  confidence: number;
}

interface PredictionOptions {
  signal?: AbortSignal;
  onUploadProgress?: (percentage: number) => void;
  onUploadComplete?: () => void;
}

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const predictionUrl = `${configuredBaseUrl}/api/predictions`;

export function createPrediction(image: File, options: PredictionOptions = {}): Promise<PredictionResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;

    const finish = (error?: Error, result?: PredictionResponse) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener('abort', abortRequest);
      if (error) reject(error);
      else resolve(result!);
    };
    const abortRequest = () => xhr.abort();

    xhr.open('POST', predictionUrl);
    xhr.responseType = 'json';
    xhr.timeout = 30000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onUploadProgress?.(Math.round(event.loaded / event.total * 100));
    };
    xhr.upload.onload = () => options.onUploadComplete?.();
    xhr.onerror = () => finish(new Error('Không thể kết nối Backend Demo. Hãy kiểm tra máy chủ và thử lại.'));
    xhr.ontimeout = () => finish(new Error('Yêu cầu quá thời gian chờ. Vui lòng thử lại.'));
    xhr.onabort = () => finish(new Error('Yêu cầu đã được hủy.'));
    xhr.onload = () => {
      const body = xhr.response;
      if (xhr.status < 200 || xhr.status >= 300) {
        const message = typeof body?.detail === 'string' ? body.detail : `Backend trả về lỗi ${xhr.status}.`;
        finish(new Error(message));
        return;
      }
      if (!body || typeof body.crop !== 'string' || !body.crop.trim()
        || typeof body.disease !== 'string' || !body.disease.trim()
        || typeof body.confidence !== 'number' || !Number.isFinite(body.confidence)
        || body.confidence < 0 || body.confidence > 1) {
        finish(new Error('Phản hồi từ Backend Demo không đúng định dạng dự kiến.'));
        return;
      }
      finish(undefined, { crop: body.crop, disease: body.disease, confidence: body.confidence });
    };

    if (options.signal?.aborted) {
      finish(new Error('Yêu cầu đã được hủy.'));
      return;
    }
    options.signal?.addEventListener('abort', abortRequest, { once: true });
    const form = new FormData();
    form.append('image', image, image.name);
    xhr.send(form);
  });
}

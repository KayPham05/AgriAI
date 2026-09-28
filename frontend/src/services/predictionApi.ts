import { DiagnosisResult, TopPrediction } from '../types';
import { DiseaseDto, PlantDto } from './catalogApi';

interface PlantDiseaseDto {
  id: string;
  plantId: string;
  diseaseId: string;
  className: string;
  classIndex: number;
  isActive: boolean;
  plant: PlantDto;
  disease: DiseaseDto;
}

interface PredictionDetailDto {
  classIndex: number;
  className: string;
  confidence: number;
  plantDisease: PlantDiseaseDto | null;
}

interface PredictionResultDto {
  id: string;
  imagePath: string;
  imagePublicId: string | null;
  predictedPlantDisease: PlantDiseaseDto;
  confidence: number;
  predictionDetails: PredictionDetailDto[];
  createdAt: string;
}

interface PredictionHistoryDto {
  id: string;
  imagePath: string;
  plantName: string;
  plantVietnameseName: string;
  diseaseName: string;
  diseaseVietnameseName: string;
  confidence: number;
  createdAt: string;
}

interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PredictionResponse {
  dto: PredictionResultDto;
  diagnosis: DiagnosisResult;
  crop: string;
  disease: string;
  confidence: number;
}

interface PredictionOptions {
  token?: string;
  signal?: AbortSignal;
  onUploadProgress?: (percentage: number) => void;
  onUploadComplete?: () => void;
}

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
const predictionUrl = `${configuredBaseUrl}/api/predictions`;

function isHealthyLabel(label: string): boolean {
  const normalized = label.toLocaleLowerCase('vi');
  return normalized.includes('healthy') || normalized.includes('khỏe');
}

function getConfidenceCategory(confidence: number): DiagnosisResult['confidenceCategory'] {
  if (confidence >= 0.85) return 'Độ tin cậy cao';
  if (confidence >= 0.6) return 'Độ tin cậy trung bình';
  return 'Độ tin cậy thấp';
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function mapTopPredictions(details: PredictionDetailDto[], fallbackLabel: string, fallbackConfidence: number): TopPrediction[] {
  if (details.length === 0) {
    return [{ label: fallbackLabel, confidence: fallbackConfidence, isHealthy: isHealthyLabel(fallbackLabel) }];
  }
  return details.map((detail) => {
    const label = detail.plantDisease?.disease.vietnameseName
      ?? detail.plantDisease?.disease.name
      ?? detail.className;
    return { label, confidence: detail.confidence, isHealthy: isHealthyLabel(label) };
  });
}

export function mapPredictionResult(dto: PredictionResultDto): DiagnosisResult {
  const plant = dto.predictedPlantDisease.plant;
  const disease = dto.predictedPlantDisease.disease;
  const plantLabel = plant.vietnameseName ?? plant.name;
  const diseaseLabel = disease.vietnameseName ?? disease.name;

  return {
    id: dto.id,
    timestamp: formatTimestamp(dto.createdAt),
    plant: plantLabel,
    scientificName: plant.scientificName ?? undefined,
    prediction: diseaseLabel,
    diseaseId: disease.id,
    confidence: dto.confidence,
    confidenceCategory: getConfidenceCategory(dto.confidence),
    top_predictions: mapTopPredictions(dto.predictionDetails, diseaseLabel, dto.confidence),
    originalImageUrl: dto.imagePath,
    gradcam_url: '',
    severity: null,
    isHealthy: isHealthyLabel(disease.name) || isHealthyLabel(diseaseLabel),
    modelVersion: 'convnext-tiny-backend',
  };
}

function mapHistoryItem(item: PredictionHistoryDto): DiagnosisResult {
  const plantLabel = item.plantVietnameseName || item.plantName;
  const diseaseLabel = item.diseaseVietnameseName || item.diseaseName;
  return {
    id: item.id,
    timestamp: formatTimestamp(item.createdAt),
    plant: plantLabel,
    prediction: diseaseLabel,
    confidence: item.confidence,
    confidenceCategory: getConfidenceCategory(item.confidence),
    top_predictions: [{ label: diseaseLabel, confidence: item.confidence, isHealthy: isHealthyLabel(diseaseLabel) }],
    originalImageUrl: item.imagePath,
    gradcam_url: '',
    severity: null,
    isHealthy: isHealthyLabel(item.diseaseName) || isHealthyLabel(diseaseLabel),
    modelVersion: 'convnext-tiny-backend',
  };
}

function getBackendError(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const message = (body as { message?: unknown; detail?: unknown }).message
      ?? (body as { detail?: unknown }).detail;
    if (typeof message === 'string') return message;
  }
  return `Backend trả về lỗi ${status}.`;
}

async function authenticatedRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${predictionUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init?.headers },
  });
  const body = await response.json().catch(() => null) as unknown;
  if (!response.ok) throw new Error(getBackendError(body, response.status));
  return body as T;
}

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
    xhr.timeout = 60000;
    if (options.token) xhr.setRequestHeader('Authorization', `Bearer ${options.token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onUploadProgress?.(Math.round(event.loaded / event.total * 100));
    };
    xhr.upload.onload = () => options.onUploadComplete?.();
    xhr.onerror = () => finish(new Error('Không thể kết nối backend. Hãy kiểm tra máy chủ và thử lại.'));
    xhr.ontimeout = () => finish(new Error('Yêu cầu quá thời gian chờ. Vui lòng thử lại.'));
    xhr.onabort = () => finish(new Error('Yêu cầu đã được hủy.'));
    xhr.onload = () => {
      const body = xhr.response as unknown;
      if (xhr.status < 200 || xhr.status >= 300) {
        finish(new Error(getBackendError(body, xhr.status)));
        return;
      }
      const dto = body as PredictionResultDto;
      if (!dto?.id || !dto.imagePath || !dto.predictedPlantDisease?.plant || !dto.predictedPlantDisease?.disease || !Number.isFinite(dto.confidence)) {
        finish(new Error('Phản hồi từ backend không đúng contract PredictionResultDto.'));
        return;
      }
      const diagnosis = mapPredictionResult(dto);
      finish(undefined, {
        dto,
        diagnosis,
        crop: diagnosis.plant,
        disease: diagnosis.prediction,
        confidence: diagnosis.confidence,
      });
    };

    if (options.signal?.aborted) {
      finish(new Error('Yêu cầu đã được hủy.'));
      return;
    }
    options.signal?.addEventListener('abort', abortRequest, { once: true });
    const form = new FormData();
    form.append('file', image, image.name);
    xhr.send(form);
  });
}

export async function getPredictionHistory(token: string): Promise<DiagnosisResult[]> {
  const result = await authenticatedRequest<PagedResult<PredictionHistoryDto>>('?pageNumber=1&pageSize=100', token);
  return result.items.map(mapHistoryItem);
}

export async function getPredictionById(id: string, token: string): Promise<DiagnosisResult> {
  const dto = await authenticatedRequest<PredictionResultDto>(`/${id}`, token);
  return mapPredictionResult(dto);
}

export async function deletePrediction(id: string, token: string): Promise<void> {
  const response = await fetch(`${predictionUrl}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as unknown;
    throw new Error(getBackendError(body, response.status));
  }
}

import type { PredictionResponse } from '@/services/predictionApi';
import { MAX_IMAGE_BYTES } from '@/utils/imageFileValidation';

export const DIAGNOSIS_ISSUE_CODES = [
  'INVALID_FORMAT',
  'FILE_TOO_LARGE',
  'CORRUPTED_OR_LOW_RES',
  'NO_LEAF_DETECTED',
  'MULTIPLE_LEAVES_CLUTTERED',
  'BLURRY_SURFACE',
  'POOR_LIGHTING',
  'OBSTRUCTED_LEAF',
  'UNSUPPORTED_SPECIES',
  'LOW_CONFIDENCE_SOFTMAX',
  'SERVER_TIMEOUT_OR_ERROR',
] as const;
export type DiagnosisIssueCode = (typeof DIAGNOSIS_ISSUE_CODES)[number];
export interface DiagnosisIssue {
  code: DiagnosisIssueCode;
  detail?: string;
}
export function isDiagnosisIssueCode(value: unknown): value is DiagnosisIssueCode {
  return typeof value === 'string' && DIAGNOSIS_ISSUE_CODES.some((code) => code === value);
}
export function isInputIssue(issue: DiagnosisIssue): boolean {
  return ['INVALID_FORMAT', 'FILE_TOO_LARGE', 'CORRUPTED_OR_LOW_RES'].includes(issue.code);
}
export function getInputIssue(file: Pick<File, 'type' | 'size'>): DiagnosisIssue | null {
  if (!['image/jpeg', 'image/png'].includes(file.type)) return { code: 'INVALID_FORMAT' };
  if (file.size === 0)
    return {
      code: 'CORRUPTED_OR_LOW_RES',
      detail: 'Tệp ảnh trống. Vui lòng tải lại ảnh gốc rõ nét hơn.',
    };
  if (file.size > MAX_IMAGE_BYTES) return { code: 'FILE_TOO_LARGE' };
  return null;
}
export function getResolutionIssue(width: number, height: number): DiagnosisIssue | null {
  return width < 224 || height < 224 ? { code: 'CORRUPTED_OR_LOW_RES' } : null;
}
export function getConfidenceIssue(result: PredictionResponse): DiagnosisIssue | null {
  const scores = result.diagnosis.top_predictions.slice(0, 3).map((item) => item.confidence);
  const evenlySpread = scores.length === 3 && Math.max(...scores) - Math.min(...scores) <= 0.05;
  return result.confidence < 0.45 || evenlySpread ? { code: 'LOW_CONFIDENCE_SOFTMAX' } : null;
}
export function getRequestIssue(cause: unknown): DiagnosisIssue {
  const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : undefined;
  return {
    code: isDiagnosisIssueCode(code) ? code : 'SERVER_TIMEOUT_OR_ERROR',
    detail: cause instanceof Error ? cause.message : undefined,
  };
}

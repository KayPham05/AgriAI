import { describe, expect, it } from 'vitest';
import {
  getInputIssue,
  getResolutionIssue,
  getConfidenceIssue,
} from '@/features/diagnosis/diagnosisIssues';
import { successfulPrediction } from '../../helpers/prediction';

describe('diagnosis issue decisions', () => {
  it.each(['image/heic', 'image/webp', 'application/pdf', 'image/gif'])(
    'blocks unsupported %s',
    (type) => {
      expect(getInputIssue({ type, size: 1000 })?.code).toBe('INVALID_FORMAT');
    },
  );
  it('accepts the size limit and rejects the next byte and empty images', () => {
    expect(getInputIssue({ type: 'image/jpeg', size: 15 * 1024 * 1024 })).toBeNull();
    expect(getInputIssue({ type: 'image/png', size: 15 * 1024 * 1024 + 1 })?.code).toBe(
      'FILE_TOO_LARGE',
    );
    expect(getInputIssue({ type: 'image/jpeg', size: 0 })?.code).toBe('CORRUPTED_OR_LOW_RES');
  });
  it('requires both image dimensions to be at least 224 pixels', () => {
    expect(getResolutionIssue(224, 224)).toBeNull();
    expect(getResolutionIssue(223, 900)?.code).toBe('CORRUPTED_OR_LOW_RES');
    expect(getResolutionIssue(900, 223)?.code).toBe('CORRUPTED_OR_LOW_RES');
  });
  it('warns below 45% without changing returned scores or inventing leaf detection', () => {
    expect(getConfidenceIssue({ ...successfulPrediction, confidence: 0.449 })?.code).toBe(
      'LOW_CONFIDENCE_SOFTMAX',
    );
    expect(getConfidenceIssue({ ...successfulPrediction, confidence: 0.45 })).toBeNull();
    expect(getConfidenceIssue(successfulPrediction)).toBeNull();
  });
  it('warns when three supplied classes are nearly tied', () => {
    const result = {
      ...successfulPrediction,
      confidence: 0.34,
      diagnosis: {
        ...successfulPrediction.diagnosis,
        top_predictions: [
          { label: 'A', confidence: 0.34 },
          { label: 'B', confidence: 0.33 },
          { label: 'C', confidence: 0.33 },
        ],
      },
    };
    expect(getConfidenceIssue(result)?.code).toBe('LOW_CONFIDENCE_SOFTMAX');
    expect(result.diagnosis.top_predictions.map((item) => item.confidence)).toEqual([
      0.34, 0.33, 0.33,
    ]);
  });
});

import { afterEach, assert, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPrediction,
  deletePrediction,
  getPredictionById,
  getPredictionHistory,
  mapPredictionResult,
} from '@/services/predictionApi';
import { DIAGNOSIS_ISSUE_CODES } from '@/features/diagnosis/diagnosisIssues';

class MockXMLHttpRequest {
  static latest: MockXMLHttpRequest | null = null;

  response: unknown = null;
  responseType: XMLHttpRequestResponseType = '';
  status = 0;
  timeout = 0;
  sentBody: Document | XMLHttpRequestBodyInit | null = null;
  readonly requestHeaders = new Map<string, string>();
  readonly upload = {
    onload: null as (() => void) | null,
    onprogress: null as ((event: ProgressEvent) => void) | null,
  };
  onabort: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  ontimeout: (() => void) | null = null;

  constructor() {
    MockXMLHttpRequest.latest = this;
  }

  open = vi.fn();

  setRequestHeader(name: string, value: string) {
    this.requestHeaders.set(name, value);
  }

  send(body: Document | XMLHttpRequestBodyInit | null) {
    this.sentBody = body;
  }

  abort() {
    this.onabort?.();
  }

  respond(status: number, response: unknown) {
    this.upload.onload?.();
    this.status = status;
    this.response = response;
    this.onload?.();
  }
}

const successfulResponse = {
  id: '4d38cde5-8bc7-4276-baa5-69e8135263f5',
  imagePath: '/uploads/predictions/example.jpg',
  imagePublicId: 'local_example.jpg',
  predictedPlantDisease: {
    id: 'plant-disease-id',
    plantId: 'plant-id',
    diseaseId: 'disease-id',
    className: 'Tomato___Early_blight',
    classIndex: 1,
    isActive: true,
    plant: {
      id: 'plant-id',
      name: 'Tomato',
      vietnameseName: 'Cà chua',
      scientificName: 'Solanum lycopersicum',
      description: null,
      imageUrl: null,
      createdAt: '2026-09-27T10:00:00Z',
    },
    disease: {
      id: 'disease-id',
      name: 'Early Blight',
      vietnameseName: 'Bệnh cháy lá sớm',
      scientificName: 'Alternaria solani',
      description: null,
      symptoms: null,
      treatment: null,
      createdAt: '2026-09-27T10:00:00Z',
    },
  },
  confidence: 0.94,
  predictionDetails: [],
  createdAt: '2026-09-27T10:00:00Z',
};

describe('createPrediction', () => {
  it.each(DIAGNOSIS_ISSUE_CODES)('preserves the structured %s code from the API', async (code) => {
    const request = createPrediction(new File(['leaf'], 'leaf.png', { type: 'image/png' }));
    MockXMLHttpRequest.latest?.respond(422, { code, message: 'Image rejected' });
    await expect(request).rejects.toMatchObject({ code, message: 'Image rejected' });
  });

  it('does not reinterpret unknown error codes as leaf detection', async () => {
    const request = createPrediction(new File(['leaf'], 'leaf.png', { type: 'image/png' }));
    MockXMLHttpRequest.latest?.respond(503, {
      code: 'SOMETHING_NEW',
      message: 'Service unavailable',
    });
    await expect(request).rejects.toMatchObject({ code: 'SERVER_TIMEOUT_OR_ERROR' });
  });
  beforeEach(() => {
    MockXMLHttpRequest.latest = null;
    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves class identity when different crops share the same translated disease label', () => {
    const diagnosis = mapPredictionResult({
      ...successfulResponse,
      predictedPlantDisease: {
        ...successfulResponse.predictedPlantDisease,
        plant: { ...successfulResponse.predictedPlantDisease.plant, isActive: true },
        disease: {
          ...successfulResponse.predictedPlantDisease.disease,
          prevention: null,
          isActive: true,
          createdAt: '2026-09-27T10:00:00Z',
        },
      },
      predictionDetails: [
        { classIndex: 2, className: 'Tomato___healthy', confidence: 0.6, plantDisease: null },
        { classIndex: 3, className: 'Potato___healthy', confidence: 0.3, plantDisease: null },
      ].map((detail) => ({
        ...detail,
        plantDisease: {
          ...successfulResponse.predictedPlantDisease,
          id: detail.className,
          classIndex: detail.classIndex,
          className: detail.className,
          plant: { ...successfulResponse.predictedPlantDisease.plant, isActive: true },
          disease: {
            ...successfulResponse.predictedPlantDisease.disease,
            vietnameseName: 'Khỏe mạnh',
            prevention: null,
            isActive: true,
            createdAt: '2026-09-27T10:00:00Z',
          },
        },
      })),
    });

    expect(diagnosis.top_predictions).toMatchObject([
      { className: 'Tomato___healthy', label: 'Khỏe mạnh', confidence: 0.6 },
      { className: 'Potato___healthy', label: 'Khỏe mạnh', confidence: 0.3 },
    ]);
  });

  it('uploads the image with the backend field name and maps a successful response', async () => {
    const onUploadComplete = vi.fn();
    const image = new File(['leaf-image'], 'leaf.jpg', { type: 'image/jpeg' });
    const request = createPrediction(image, { token: 'jwt-token', onUploadComplete });
    const xhr = MockXMLHttpRequest.latest;

    assert(xhr, 'The request should create an XMLHttpRequest');
    expect(xhr.open).toHaveBeenCalledWith('POST', '/api/predictions');
    expect(xhr.requestHeaders.get('Authorization')).toBe('Bearer jwt-token');
    assert(xhr.sentBody instanceof FormData, 'The request body should be FormData');
    const uploadedFile = xhr.sentBody.get('file');
    assert(uploadedFile instanceof File, 'The file field should contain an image');
    expect(uploadedFile.name).toBe(image.name);
    expect(uploadedFile.type).toBe(image.type);
    expect(uploadedFile.size).toBe(image.size);

    xhr.respond(201, successfulResponse);
    const result = await request;

    expect(onUploadComplete).toHaveBeenCalledOnce();
    expect(result.crop).toBe('Cà chua');
    expect(result.disease).toBe('Bệnh cháy lá sớm');
    expect(result.confidence).toBe(0.94);
    expect(result.diagnosis.originalImageUrl).toBe('/uploads/predictions/example.jpg');
  });

  it('adds the selected agricultural profile to the multipart request', async () => {
    const request = createPrediction(
      new File(['leaf-image'], 'leaf.jpg', { type: 'image/jpeg' }),
      { token: 'jwt-token', agriculturalProfileId: 'profile-1' },
    );
    const xhr = MockXMLHttpRequest.latest;

    assert(xhr);
    assert(xhr.sentBody instanceof FormData);
    expect(xhr.sentBody.get('agriculturalProfileId')).toBe('profile-1');

    xhr.respond(201, successfulResponse);
    await request;
  });

  it('returns the backend error message for an unsuccessful response', async () => {
    const request = createPrediction(new File(['leaf'], 'leaf.png', { type: 'image/png' }));

    MockXMLHttpRequest.latest?.respond(422, { message: 'Ảnh không hợp lệ.' });

    await expect(request).rejects.toThrow('Ảnh không hợp lệ.');
  });

  it('accepts a Guest result without a stored image or authorization header', async () => {
    const request = createPrediction(new File(['leaf'], 'leaf.png', { type: 'image/png' }));
    const xhr = MockXMLHttpRequest.latest;
    assert(xhr);
    xhr.respond(200, { ...successfulResponse, imagePath: '', imagePublicId: null });

    const result = await request;
    expect(result.diagnosis).toMatchObject({
      prediction: 'Bệnh cháy lá sớm',
      confidence: 0.94,
      originalImageUrl: '',
    });
    expect(xhr.requestHeaders.has('Authorization')).toBe(false);
  });

  it.each([
    ['missing details', { predictionDetails: undefined }],
    ['invalid timestamp', { createdAt: 'not-a-date' }],
    ['negative confidence', { confidence: -0.01 }],
    ['confidence above one', { confidence: 1.01 }],
    ['non-finite confidence', { confidence: Number.NaN }],
  ])('rejects a malformed successful response: %s', async (_name, changes) => {
    const request = createPrediction(new File(['leaf'], 'leaf.png', { type: 'image/png' }));
    const assertion = expect(request).rejects.toThrow('không đúng contract');
    MockXMLHttpRequest.latest?.respond(200, { ...successfulResponse, ...changes });
    await assertion;
  });

  it('does not upload when the cancellation signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const request = createPrediction(new File(['leaf'], 'leaf.png', { type: 'image/png' }), {
      signal: controller.signal,
    });

    await expect(request).rejects.toThrow('đã được hủy');
    expect(MockXMLHttpRequest.latest?.sentBody).toBeNull();
  });

  it('rejects a successful response that does not match the expected contract', async () => {
    const request = createPrediction(new File(['leaf'], 'leaf.png', { type: 'image/png' }));

    MockXMLHttpRequest.latest?.respond(200, { crop: 'Tomato' });

    await expect(request).rejects.toThrow('không đúng contract');
  });

  it('shows a clear timeout error and rejects a network failure', async () => {
    const timedOut = createPrediction(new File(['leaf'], 'leaf.png', { type: 'image/png' }));
    MockXMLHttpRequest.latest?.ontimeout?.();
    await expect(timedOut).rejects.toThrow('quá thời gian chờ');

    const networkFailure = createPrediction(new File(['leaf'], 'leaf.png', { type: 'image/png' }));
    MockXMLHttpRequest.latest?.onerror?.();
    await expect(networkFailure).rejects.toThrow('Không thể kết nối backend');
  });

  it('aborts a request when its signal is cancelled', async () => {
    const controller = new AbortController();
    const request = createPrediction(new File(['leaf'], 'leaf.png', { type: 'image/png' }), {
      signal: controller.signal,
    });

    controller.abort();

    await expect(request).rejects.toThrow('đã được hủy');
  });

  it('maps top predictions and healthy labels from a complete response', async () => {
    const request = createPrediction(new File(['leaf'], 'leaf.png', { type: 'image/png' }));
    MockXMLHttpRequest.latest?.respond(201, {
      ...successfulResponse,
      predictedPlantDisease: {
        ...successfulResponse.predictedPlantDisease,
        disease: {
          ...successfulResponse.predictedPlantDisease.disease,
          name: 'Healthy',
          vietnameseName: null,
        },
      },
      predictionDetails: [
        {
          classIndex: 0,
          className: 'Tomato___Healthy',
          confidence: 0.94,
          plantDisease: null,
        },
      ],
    });

    const result = await request;

    expect(result.diagnosis.isHealthy).toBe(true);
    expect(result.diagnosis.top_predictions).toEqual([
      expect.objectContaining({ label: 'Tomato___Healthy', confidence: 0.94, isHealthy: true }),
    ]);
  });
});

describe('prediction history requests', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads history with the user token and maps localized labels', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'one',
            imagePath: '/leaf.jpg',
            plantName: 'Tomato',
            plantVietnameseName: 'Cà chua',
            diseaseName: 'Early Blight',
            diseaseVietnameseName: 'Cháy lá sớm',
            confidence: 0.8,
            createdAt: '2026-09-27T10:00:00Z',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const items = await getPredictionHistory('jwt-token');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/predictions?pageNumber=1&pageSize=100',
      expect.objectContaining({ headers: { Authorization: 'Bearer jwt-token' } }),
    );
    expect(items[0]).toMatchObject({
      plant: 'Cà chua',
      prediction: 'Cháy lá sớm',
      confidence: 0.8,
    });
  });

  it('surfaces backend errors when loading a prediction', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ message: 'AI service is unavailable.' }),
      }),
    );

    await expect(getPredictionById('one', 'jwt-token')).rejects.toThrow(
      'AI service is unavailable.',
    );
  });

  it('deletes a prediction with authorization and reports failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: 'Forbidden' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await deletePrediction('one', 'jwt-token');
    await expect(deletePrediction('two', 'jwt-token')).rejects.toThrow('Forbidden');
    expect(fetchMock).toHaveBeenCalledWith('/api/predictions/one', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer jwt-token' },
    });
  });
});

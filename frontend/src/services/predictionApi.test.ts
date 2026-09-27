import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrediction } from './predictionApi';

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
  beforeEach(() => {
    MockXMLHttpRequest.latest = null;
    vi.stubGlobal('XMLHttpRequest', MockXMLHttpRequest);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uploads the image with the backend field name and maps a successful response', async () => {
    const onUploadComplete = vi.fn();
    const image = new File(['leaf-image'], 'leaf.jpg', { type: 'image/jpeg' });
    const request = createPrediction(image, { token: 'jwt-token', onUploadComplete });
    const xhr = MockXMLHttpRequest.latest;

    expect(xhr).not.toBeNull();
    expect(xhr?.open).toHaveBeenCalledWith('POST', '/api/predictions');
    expect(xhr?.requestHeaders.get('Authorization')).toBe('Bearer jwt-token');
    expect(xhr?.sentBody).toBeInstanceOf(FormData);
    const uploadedFile = (xhr?.sentBody as FormData).get('file') as File;
    expect(uploadedFile.name).toBe(image.name);
    expect(uploadedFile.type).toBe(image.type);
    expect(uploadedFile.size).toBe(image.size);

    xhr?.respond(201, successfulResponse);
    const result = await request;

    expect(onUploadComplete).toHaveBeenCalledOnce();
    expect(result.crop).toBe('Cà chua');
    expect(result.disease).toBe('Bệnh cháy lá sớm');
    expect(result.confidence).toBe(0.94);
    expect(result.diagnosis.originalImageUrl).toBe('/uploads/predictions/example.jpg');
  });

  it('returns the backend error message for an unsuccessful response', async () => {
    const request = createPrediction(new File(['leaf'], 'leaf.png', { type: 'image/png' }));

    MockXMLHttpRequest.latest?.respond(422, { message: 'Ảnh không hợp lệ.' });

    await expect(request).rejects.toThrow('Ảnh không hợp lệ.');
  });

  it('rejects a successful response that does not match the expected contract', async () => {
    const request = createPrediction(new File(['leaf'], 'leaf.png', { type: 'image/png' }));

    MockXMLHttpRequest.latest?.respond(200, { crop: 'Tomato' });

    await expect(request).rejects.toThrow('không đúng contract');
  });
});

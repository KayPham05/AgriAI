import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readGuestPredictionDraft } from '@/features/diagnosis/guestPredictionDraft';
import { SUPPORTED_PLANTS } from '@/data/plantData';
import { IntroPage } from '@/views/IntroPage';
import { successfulPrediction } from '../../helpers/prediction';

class PredictionRequest {
  static latest: PredictionRequest | undefined;
  response: unknown = null;
  status = 0;
  responseType = '';
  timeout = 0;
  body: FormData | null = null;
  headers = new Map<string, string>();
  upload = { onload: null as (() => void) | null, onprogress: null };
  onload: (() => void) | null = null;
  onabort: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  open = vi.fn();
  constructor() {
    PredictionRequest.latest = this;
  }
  setRequestHeader(name: string, value: string) {
    this.headers.set(name, value);
  }
  send(body: FormData) {
    this.body = body;
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

beforeEach(() => {
  PredictionRequest.latest = undefined;
  vi.stubGlobal('XMLHttpRequest', PredictionRequest);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null;
      naturalWidth = 1200;
      naturalHeight = 800;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

async function selectLeaf() {
  const trial = screen.getByRole('region', { name: 'Dự đoán ngay' });
  await userEvent.upload(
    within(trial).getByLabelText('Chọn ảnh lá cây'),
    new File(['leaf'], 'leaf.jpg', { type: 'image/jpeg' }),
  );
  await within(trial).findByRole('img', { name: 'Ảnh xem trước: leaf.jpg' });
  return trial;
}

describe('landing prediction without persistence', () => {
  it('runs anonymously even with a stored session and shows the result without writing history', async () => {
    localStorage.setItem(
      'leafai_auth_session',
      JSON.stringify({
        token: 'stored-jwt',
        user: {
          id: 'owner',
          email: 'owner@example.test',
          fullName: 'Người trồng',
          role: 'User',
          createdAt: '2026-09-27T10:00:00Z',
        },
      }),
    );
    const previousHistory = JSON.stringify([successfulPrediction.diagnosis]);
    localStorage.setItem('leafai_history', previousHistory);
    const writeStorage = vi.spyOn(Storage.prototype, 'setItem');
    render(<IntroPage plants={SUPPORTED_PLANTS} onLogin={vi.fn()} onRegister={vi.fn()} />);
    const trial = await selectLeaf();
    expect(PredictionRequest.latest).toBeUndefined();
    expect(within(trial).queryByRole('combobox')).not.toBeInTheDocument();
    await userEvent.click(within(trial).getByRole('button', { name: 'Phân tích ngay' }));
    const request = PredictionRequest.latest;
    expect(request).toBeDefined();
    expect(request?.open).toHaveBeenCalledWith('POST', '/api/predictions');
    expect(request?.headers.has('Authorization')).toBe(false);
    expect(request?.body?.has('agriculturalProfileId')).toBe(false);
    expect(within(trial).getByRole('button', { name: /Đang tải lên/ })).toBeDisabled();
    await act(async () => request?.respond(200, successfulPrediction.dto));
    expect(within(trial).getByRole('heading', { name: 'Bệnh cháy lá sớm' })).toBeVisible();
    expect(within(trial).getAllByText('94.0%').length).toBeGreaterThan(0);
    expect(writeStorage).not.toHaveBeenCalled();
    expect(localStorage.getItem('leafai_history')).toBe(previousHistory);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('preserves the guest result and requests login only when the visitor chooses to save', async () => {
    const onSaveGuestResult = vi.fn();
    render(
      <IntroPage
        plants={SUPPORTED_PLANTS}
        onLogin={vi.fn()}
        onRegister={vi.fn()}
        onSaveGuestResult={onSaveGuestResult}
      />,
    );
    const trial = await selectLeaf();
    await userEvent.click(within(trial).getByRole('button', { name: 'Phân tích ngay' }));
    await act(async () =>
      PredictionRequest.latest?.respond(200, {
        ...successfulPrediction.dto,
        guestToken: 'guest-token',
      }),
    );
    expect(onSaveGuestResult).not.toHaveBeenCalled();
    await userEvent.click(within(trial).getByRole('button', { name: 'Lưu kết quả vào tài khoản' }));
    expect(onSaveGuestResult).toHaveBeenCalledOnce();
    expect(readGuestPredictionDraft()).toMatchObject({
      saveRequested: true,
      result: { dto: { guestToken: 'guest-token', id: successfulPrediction.dto.id } },
    });
    expect(PredictionRequest.latest?.headers.has('Authorization')).toBe(false);
  });

  it('rejects an empty image without making a prediction request', async () => {
    render(<IntroPage plants={SUPPORTED_PLANTS} onLogin={vi.fn()} onRegister={vi.fn()} />);
    const trial = screen.getByRole('region', { name: 'Dự đoán ngay' });
    fireEvent.change(within(trial).getByLabelText('Chọn ảnh lá cây'), {
      target: { files: [new File([], 'empty.jpg', { type: 'image/jpeg' })] },
    });
    expect(await within(trial).findByRole('alert')).toHaveTextContent(/Tệp ảnh trống/);
    expect(PredictionRequest.latest).toBeUndefined();
  });

  it('shows a server error and retries with the same selected image', async () => {
    render(<IntroPage plants={SUPPORTED_PLANTS} onLogin={vi.fn()} onRegister={vi.fn()} />);
    const trial = await selectLeaf();
    await userEvent.click(within(trial).getByRole('button', { name: 'Phân tích ngay' }));
    await act(async () =>
      PredictionRequest.latest?.respond(503, { message: 'Temporarily unavailable' }),
    );
    expect(within(trial).getByRole('alert')).toBeVisible();
    expect(
      within(trial).queryByRole('heading', { name: 'Bệnh cháy lá sớm' }),
    ).not.toBeInTheDocument();
    await userEvent.click(within(trial).getByRole('button', { name: 'Phân tích lại ngay' }));
    await act(async () => PredictionRequest.latest?.respond(200, successfulPrediction.dto));
    expect(within(trial).getByRole('heading', { name: 'Bệnh cháy lá sớm' })).toBeVisible();
  });
});

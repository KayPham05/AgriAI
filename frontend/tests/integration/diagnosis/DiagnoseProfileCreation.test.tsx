import { useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiagnoseRoute } from '@/features/diagnosis/DiagnoseRoute';
import {
  AgriculturalProfileContext,
  AuthContext,
  CatalogContext,
  HistoryContext,
} from '@/providers/AppContexts';
import type {
  AgriculturalProfile,
  AgriculturalProfileInput,
} from '@/services/agriculturalProfileApi';
import { createPrediction, assignPredictionProfile } from '@/services/predictionApi';
import { successfulPrediction } from '../../helpers/prediction';

vi.mock('@/services/predictionApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/predictionApi')>();
  return { ...actual, createPrediction: vi.fn(), assignPredictionProfile: vi.fn() };
});

const existing: AgriculturalProfile = {
  id: 'garden',
  userId: 'owner',
  name: 'Vườn nhà',
  description: null,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: null,
  predictionCount: 0,
};
const created: AgriculturalProfile = {
  ...existing,
  id: 'new-garden',
  name: 'Vườn mới',
  description: 'Đất phù sa',
};
const saveProfile = vi.fn<(input: AgriculturalProfileInput) => Promise<AgriculturalProfile>>();
const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');

beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  }),
);
afterAll(() => {
  if (scrollDescriptor)
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor);
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});

function Harness({
  initial = [],
  authenticated = true,
}: {
  initial?: AgriculturalProfile[];
  authenticated?: boolean;
}) {
  const [profiles, setProfiles] = useState(initial);
  return (
    <AuthContext
      value={{
        session: authenticated
          ? {
              token: 'test-token',
              user: {
                id: 'owner',
                email: 'owner@example.test',
                fullName: 'Người trồng',
                role: 'User',
                createdAt: '2026-10-01T00:00:00Z',
              },
            }
          : null,
        profile: {
          name: 'Người trồng',
          email: 'owner@example.test',
          avatarUrl: '',
          role: 'User',
          location: '',
          joinedDate: '',
        },
        openAuthentication: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn(),
        updateAccount: vi.fn(),
      }}
    >
      <CatalogContext value={{ plants: [], diseases: [] }}>
        <HistoryContext
          value={{
            history: [],
            addPrediction: vi.fn(),
            deleteHistoryItem: vi.fn(),
            viewHistoryItem: vi.fn(),
          }}
        >
          <AgriculturalProfileContext
            value={{
              profiles,
              isLoading: false,
              error: null,
              createProfile: async (input) => {
                const result = await saveProfile(input);
                setProfiles((current) => [result, ...current]);
                return result;
              },
              updateProfile: vi.fn(),
              deleteProfile: vi.fn(),
            }}
          >
            <DiagnoseRoute />
          </AgriculturalProfileContext>
        </HistoryContext>
      </CatalogContext>
    </AuthContext>
  );
}

async function analyze() {
  await userEvent.upload(
    screen.getByLabelText(/Chọn ảnh lá cây/i),
    new File(['leaf'], 'leaf.jpg', { type: 'image/jpeg' }),
  );
  await screen.findByRole('img', { name: 'Ảnh xem trước: leaf.jpg' });
  await userEvent.click(screen.getByRole('button', { name: 'Phân tích ngay' }));
}
async function chooseProfile(name: string) {
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Hồ sơ nông nghiệp' }), {
    key: 'ArrowDown',
  });
  fireEvent.keyDown(await screen.findByRole('option', { name }), { key: 'Enter' });
}
const promptName = 'Bạn có muốn lưu kết quả vào hồ sơ nông nghiệp không?';
describe('save completed diagnosis into a profile', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/diagnose');
    saveProfile.mockReset().mockResolvedValue(created);
    vi.mocked(assignPredictionProfile).mockReset().mockResolvedValue(undefined);
    vi.mocked(createPrediction).mockReset().mockResolvedValue(successfulPrediction);
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        naturalWidth = 1200;
        naturalHeight = 800;
        set src(_v: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
  });
  it('asks only after success and assigns the existing result without another inference', async () => {
    render(<Harness initial={[existing]} />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    await analyze();
    await screen.findByRole('dialog', { name: promptName });
    await chooseProfile('Vườn nhà');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu vào hồ sơ' }));
    expect(assignPredictionProfile).toHaveBeenCalledExactlyOnceWith(
      'prediction-id',
      'garden',
      'test-token',
    );
    expect(createPrediction).toHaveBeenCalledOnce();
    expect(createPrediction).toHaveBeenCalledWith(
      expect.any(File),
      expect.not.objectContaining({ agriculturalProfileId: expect.anything() }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu kết quả vào hồ sơ');
  });
  it('skips without changing the result or assigning a profile', async () => {
    render(<Harness initial={[existing]} />);
    await analyze();
    await screen.findByRole('dialog', { name: promptName });
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ qua' }));
    expect(assignPredictionProfile).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu vào hồ sơ nông nghiệp' })).toBeVisible();
  });
  it('creates the first profile, then waits for explicit save before assigning', async () => {
    render(<Harness />);
    await analyze();
    await screen.findByRole('dialog', { name: promptName });
    await userEvent.click(screen.getByRole('button', { name: 'Thêm hồ sơ mới' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm hồ sơ mới' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Tên hồ sơ *' }), 'Vườn mới');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo hồ sơ' }));
    await screen.findByRole('dialog', { name: promptName });
    expect(screen.getByRole('combobox')).toHaveTextContent('Vườn mới');
    expect(assignPredictionProfile).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu vào hồ sơ' }));
    expect(assignPredictionProfile).toHaveBeenCalledWith(
      'prediction-id',
      'new-garden',
      'test-token',
    );
    expect(createPrediction).toHaveBeenCalledOnce();
  });
  it('retains the result and selected profile after a save error and retries', async () => {
    vi.mocked(assignPredictionProfile).mockRejectedValueOnce(new Error('Không thể lưu lúc này.'));
    render(<Harness initial={[existing]} />);
    await analyze();
    await screen.findByRole('dialog', { name: promptName });
    await chooseProfile('Vườn nhà');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu vào hồ sơ' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể lưu lúc này.');
    expect(screen.getByRole('combobox')).toHaveTextContent('Vườn nhà');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu vào hồ sơ' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(createPrediction).toHaveBeenCalledOnce();
  });
  it('prevents duplicate save and dismissing a pending save', async () => {
    let finish!: () => void;
    vi.mocked(assignPredictionProfile).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(<Harness initial={[existing]} />);
    await analyze();
    await screen.findByRole('dialog', { name: promptName });
    await chooseProfile('Vườn nhà');
    await userEvent.dblClick(screen.getByRole('button', { name: 'Lưu vào hồ sơ' }));
    expect(screen.getByRole('button', { name: 'Đang lưu...' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(assignPredictionProfile).toHaveBeenCalledOnce();
    await act(async () => finish());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('does not prompt guests or failed predictions', async () => {
    render(<Harness authenticated={false} />);
    await analyze();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(assignPredictionProfile).not.toHaveBeenCalled();
  });
  it('does not prompt when inference fails', async () => {
    vi.mocked(createPrediction).mockRejectedValueOnce(new Error('Không thể phân tích.'));
    render(<Harness />);
    await analyze();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(assignPredictionProfile).not.toHaveBeenCalled();
  });
});

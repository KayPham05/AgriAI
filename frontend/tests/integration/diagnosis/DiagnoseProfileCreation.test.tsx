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
import { createPrediction } from '@/services/predictionApi';
import { successfulPrediction } from '../../helpers/prediction';

vi.mock('@/services/predictionApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/predictionApi')>();
  return { ...actual, createPrediction: vi.fn() };
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

async function openCreateProfile() {
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Hồ sơ nông nghiệp' }), {
    key: 'ArrowDown',
  });
  const option = await screen.findByRole('option', { name: 'Thêm hồ sơ mới' });
  fireEvent.keyDown(option, { key: 'Enter' });
  return screen.findByRole('dialog', { name: 'Thêm hồ sơ mới' });
}

async function selectImage() {
  await userEvent.upload(
    screen.getByLabelText(/Chọn ảnh lá cây/i),
    new File(['leaf'], 'leaf.jpg', { type: 'image/jpeg' }),
  );
  expect(await screen.findByRole('img', { name: 'Ảnh xem trước: leaf.jpg' })).toBeVisible();
}

describe('create profile from diagnosis', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/diagnose');
    saveProfile.mockReset().mockResolvedValue(created);
    vi.mocked(createPrediction).mockReset().mockResolvedValue(successfulPrediction);
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

  it('creates the first profile, selects it and preserves the selected image for prediction', async () => {
    render(<Harness />);
    await selectImage();
    const dialog = await openCreateProfile();
    const user = userEvent.setup();
    await user.type(within(dialog).getByRole('textbox', { name: 'Tên hồ sơ *' }), '  Vườn mới  ');
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Mô tả và thông tin canh tác' }),
      '  Đất phù sa  ',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Tạo hồ sơ' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Hồ sơ nông nghiệp' })).toHaveTextContent(
      'Vườn mới',
    );
    expect(screen.getByRole('img', { name: 'Ảnh xem trước: leaf.jpg' })).toBeVisible();
    expect(saveProfile).toHaveBeenCalledExactlyOnceWith({
      name: 'Vườn mới',
      description: 'Đất phù sa',
    });
    expect(createPrediction).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Phân tích ngay' }));
    expect(createPrediction).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({ agriculturalProfileId: 'new-garden' }),
    );
  });

  it('keeps entered data and the image after a save error, then retries successfully', async () => {
    saveProfile.mockRejectedValueOnce(new Error('Không thể lưu hồ sơ lúc này.'));
    render(<Harness />);
    await selectImage();
    const dialog = await openCreateProfile();
    const user = userEvent.setup();
    await user.type(within(dialog).getByRole('textbox', { name: 'Tên hồ sơ *' }), 'Vườn mới');
    await user.click(within(dialog).getByRole('button', { name: 'Tạo hồ sơ' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Không thể lưu hồ sơ lúc này.',
    );
    expect(within(dialog).getByRole('textbox', { name: 'Tên hồ sơ *' })).toHaveValue('Vườn mới');
    await user.click(within(dialog).getByRole('button', { name: 'Tạo hồ sơ' }));
    expect(screen.getByRole('combobox', { name: 'Hồ sơ nông nghiệp' })).toHaveTextContent(
      'Vườn mới',
    );
    expect(screen.getByRole('img', { name: 'Ảnh xem trước: leaf.jpg' })).toBeVisible();
  });

  it('cancels creation without changing the previously selected profile or image', async () => {
    window.history.replaceState({}, '', '/diagnose?profile=garden');
    render(<Harness initial={[existing]} />);
    await selectImage();
    const dialog = await openCreateProfile();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));
    expect(screen.getByRole('combobox', { name: 'Hồ sơ nông nghiệp' })).toHaveTextContent(
      'Vườn nhà',
    );
    expect(screen.getByRole('img', { name: 'Ảnh xem trước: leaf.jpg' })).toBeVisible();
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it('blocks duplicate submissions and closing while the create request is pending', async () => {
    let finish!: (profile: AgriculturalProfile) => void;
    saveProfile.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<Harness />);
    const dialog = await openCreateProfile();
    const user = userEvent.setup();
    await user.type(within(dialog).getByRole('textbox', { name: 'Tên hồ sơ *' }), 'Vườn mới');
    await user.dblClick(within(dialog).getByRole('button', { name: 'Tạo hồ sơ' }));
    expect(within(dialog).getByRole('button', { name: 'Đang lưu...' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Hủy' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(saveProfile).toHaveBeenCalledOnce();
    await act(async () => finish(created));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not offer profile creation to a guest', () => {
    render(<Harness authenticated={false} />);
    expect(screen.queryByRole('combobox', { name: 'Hồ sơ nông nghiệp' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(saveProfile).not.toHaveBeenCalled();
  });
});

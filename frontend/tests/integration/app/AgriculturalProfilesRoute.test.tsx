import { useState, type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgriculturalProfilesRoute } from '@/features/agricultural-profiles/AgriculturalProfilesRoute';
import { AgriculturalProfileContext, AuthContext, HistoryContext } from '@/providers/AppContexts';
import type { AgriculturalProfile } from '@/services/agriculturalProfileApi';

const profiles: AgriculturalProfile[] = [
  {
    id: 'garden',
    userId: 'owner',
    name: 'Vườn nhà',
    description: 'Đất phù sa',
    createdAt: '2026-10-20T00:00:00Z',
    updatedAt: '2026-10-24T00:00:00Z',
    predictionCount: 1,
  },
  {
    id: 'east',
    userId: 'owner',
    name: 'Khu canh tác phía Đông',
    description: null,
    createdAt: '2026-10-20T00:00:00Z',
    updatedAt: null,
    predictionCount: 0,
  },
];

function Harness({
  children,
  initial = profiles,
}: {
  children: ReactNode;
  initial?: AgriculturalProfile[];
}) {
  const [items, setItems] = useState(initial);
  return (
    <AuthContext
      value={{
        session: {
          token: 'test-token',
          user: {
            id: 'owner',
            email: 'owner@example.test',
            fullName: 'Người trồng',
            role: 'User',
            createdAt: '2026-10-01T00:00:00Z',
          },
        },
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
            profiles: items,
            isLoading: false,
            error: null,
            createProfile: async (input) => {
              const created = { ...profiles[0], ...input, id: 'new' };
              setItems((current) => [...current, created]);
              return created;
            },
            updateProfile: async (id, input) => {
              const updated = { ...profiles[0], ...input, id };
              setItems((current) => current.map((item) => (item.id === id ? updated : item)));
              return updated;
            },
            deleteProfile: async (id) => {
              setItems((current) => current.filter((item) => item.id !== id));
            },
          }}
        >
          {children}
        </AgriculturalProfileContext>
      </HistoryContext>
    </AuthContext>
  );
}

describe('agricultural profile management', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [],
          pageNumber: 1,
          hasNextPage: false,
          totalCount: 0,
          totalPages: 0,
        }),
      }),
    );
  });

  it('searches owned profiles by name and recovers from no matches', async () => {
    render(
      <Harness>
        <AgriculturalProfilesRoute />
      </Harness>,
    );
    const user = userEvent.setup();
    const search = screen.getByRole('searchbox', { name: 'Tìm hồ sơ' });
    await user.type(search, '  PHÍA ĐÔNG');
    expect(screen.getByRole('heading', { name: 'Khu canh tác phía Đông' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Vườn nhà' })).not.toBeInTheDocument();
    await user.clear(search);
    await user.type(search, 'không tồn tại');
    expect(screen.getByText('Không có kết quả tìm kiếm')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xóa tìm kiếm' }));
    expect(screen.getAllByRole('button', { name: 'Xem chi tiết' })).toHaveLength(2);
  });

  it('opens a real profile summary and links diagnosis to that profile', async () => {
    render(
      <Harness>
        <AgriculturalProfilesRoute />
      </Harness>,
    );
    await userEvent.click(screen.getAllByRole('button', { name: 'Xem chi tiết' })[0]);
    expect(screen.getByRole('heading', { name: 'Thông tin canh tác' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chẩn đoán với hồ sơ này' })).toHaveAttribute(
      'href',
      '/diagnose?profile=garden',
    );
    expect(await screen.findByText('Chưa có chẩn đoán trong hồ sơ này.')).toBeInTheDocument();
  });

  it('creates and edits a profile using the existing data contract', async () => {
    render(
      <Harness initial={[]}>
        <AgriculturalProfilesRoute />
      </Harness>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Tạo hồ sơ đầu tiên' }));
    await user.type(screen.getByRole('textbox', { name: 'Tên hồ sơ *' }), 'Vườn mới');
    await user.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));
    expect(screen.getByRole('heading', { name: 'Vườn mới' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa' }));
    const name = screen.getByRole('textbox', { name: 'Tên hồ sơ *' });
    await user.clear(name);
    await user.type(name, 'Vườn đã sửa');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(screen.getByRole('heading', { name: 'Vườn đã sửa' })).toBeInTheDocument();
    expect(screen.getByText('Đã cập nhật hồ sơ.')).toHaveAttribute('role', 'status');
  });

  it('requires confirmation and explains preserved history before deletion', async () => {
    render(
      <Harness>
        <AgriculturalProfilesRoute />
      </Harness>,
    );
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: 'Xem chi tiết' })[0]);
    await user.click(screen.getByRole('button', { name: 'Xóa hồ sơ' }));
    expect(screen.getByText('Lịch sử chẩn đoán vẫn được giữ')).toBeInTheDocument();
    expect(screen.getByText(/không xóa ngay hoặc gia hạn thời gian lưu ảnh/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Giữ hồ sơ' }));
    expect(screen.getByRole('heading', { name: 'Vườn nhà' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xóa hồ sơ' }));
    await user.click(screen.getByRole('button', { name: 'Xóa hồ sơ' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Đã xóa hồ sơ. Lịch sử chẩn đoán vẫn được giữ.',
    );
    const list = screen.getByRole('region', { name: 'Danh sách hồ sơ của bạn' });
    expect(within(list).queryByRole('heading', { name: 'Vườn nhà' })).not.toBeInTheDocument();
  });
});

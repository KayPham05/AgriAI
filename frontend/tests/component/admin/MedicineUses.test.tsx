import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MedicineUses } from '@/features/knowledge/MedicineUses';
import { medicine, pair, json } from '../../helpers/knowledge';

describe('medicine label review', () => {
  it('searches only inside the picker and selects a pair with the keyboard', async () => {
    const otherPair = {
      ...pair,
      id: 'pair-b',
      plantName: 'Lúa',
      diseaseName: 'Đạo ôn',
      className: 'Lua___Dao_on',
    };
    render(
      <MedicineUses
        token="admin"
        pairs={[pair, otherPair]}
        record={medicine}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Chọn cặp cây và bệnh' }));
    const popup = screen.getByRole('dialog', { name: 'Chọn cặp cây và bệnh' });
    await userEvent.type(within(popup).getByRole('combobox'), 'LUA dao_ON');
    expect(
      within(popup).queryByRole('option', { name: 'Cà chua / Cháy lá' }),
    ).not.toBeInTheDocument();
    expect(within(popup).getByRole('option', { name: 'Lúa / Đạo ôn' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Sửa hướng dẫn Cà chua/ })).toBeVisible();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chọn cặp cây và bệnh' })).toHaveTextContent(
      'Lúa / Đạo ôn',
    );
    expect(screen.getByLabelText('Hướng dẫn trên nhãn')).toHaveValue('');
  });

  it('dismisses an empty search without changing the selected pair or draft', async () => {
    render(<MedicineUses token="admin" pairs={[pair]} record={medicine} onRefresh={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Sửa hướng dẫn/ }));
    await userEvent.type(screen.getByLabelText('Hướng dẫn trên nhãn'), ' mới');
    await userEvent.click(screen.getByRole('button', { name: 'Chọn cặp cây và bệnh' }));
    await userEvent.type(within(screen.getByRole('dialog')).getByRole('combobox'), 'missing');
    expect(screen.getByRole('status')).toHaveTextContent('Không tìm thấy');
    await userEvent.keyboard('{Escape}');
    expect(screen.getByLabelText('Hướng dẫn trên nhãn')).toHaveValue('Hướng dẫn kiểm thử mới');
    await userEvent.click(screen.getByRole('button', { name: 'Chọn cặp cây và bệnh' }));
    expect(within(screen.getByRole('dialog')).getByRole('combobox')).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Cà chua / Cháy lá' })).toBeVisible();
  });
  it.each([
    { conditionType: 'Unknown', plantIsActive: true, diseaseIsActive: true },
    { conditionType: 'Healthy', plantIsActive: true, diseaseIsActive: true },
    { conditionType: 'NutrientDeficiency', plantIsActive: true, diseaseIsActive: true },
    { conditionType: 'Disease', plantIsActive: false, diseaseIsActive: true },
    { conditionType: 'Disease', plantIsActive: true, diseaseIsActive: false },
    { conditionType: 'Disease', plantIsActive: true, diseaseIsActive: true, isActive: false },
  ])('blocks an ineligible pair but allows removing its existing link: %j', async (state) => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    render(
      <MedicineUses
        token="admin"
        pairs={[{ ...pair, ...state }]}
        record={medicine}
        onRefresh={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Sửa hướng dẫn/ }));
    expect(screen.getByRole('button', { name: 'Lưu hướng dẫn' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Xác minh nhãn' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Duyệt liên kết' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/chưa|không|ngừng/i);
    await userEvent.click(screen.getByRole('button', { name: 'Gỡ liên kết' }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xác nhận' }),
    );
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
  });
  it.each(['verify', 'approve', 'remove'] as const)(
    'performs %s separately from editing and refreshes the parent',
    async (action) => {
      const fetch = vi
        .fn()
        .mockResolvedValue(action === 'remove' ? new Response(null, { status: 204 }) : json({}));
      vi.stubGlobal('fetch', fetch);
      const refresh = vi.fn().mockResolvedValue(undefined);
      render(
        <MedicineUses
          token="admin"
          pairs={[pair]}
          onRefresh={refresh}
          record={{
            ...medicine,
            uses: [
              {
                plantDiseaseId: pair.id,
                labelDirections: 'Hướng dẫn kiểm thử',
                isLabelVerified: action !== 'verify',
                isApproved: false,
              },
            ],
          }}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: /Sửa hướng dẫn/ }));
      await userEvent.click(
        screen.getByRole('button', {
          name:
            action === 'verify'
              ? 'Xác minh nhãn'
              : action === 'approve'
                ? 'Duyệt liên kết'
                : 'Gỡ liên kết',
        }),
      );
      if (action === 'remove') {
        expect(fetch).not.toHaveBeenCalled();
        await userEvent.click(
          within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xác nhận' }),
        );
      }
      const [url, init] = fetch.mock.calls[0];
      expect(url).toBe('/api/admin/medicines/medicine-a/uses/pair-a');
      expect(init.method).toBe(action === 'remove' ? 'DELETE' : 'PUT');
      if (action !== 'remove')
        expect(JSON.parse(init.body)).toEqual({
          labelDirections: 'Hướng dẫn kiểm thử',
          ...(action === 'verify' ? { isLabelVerified: true } : { isApproved: true }),
        });
      expect(refresh).toHaveBeenCalledOnce();
    },
  );
  it('keeps changed directions on failure and disallows verification until they are saved', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 403)));
    const refresh = vi.fn();
    render(<MedicineUses token="admin" pairs={[pair]} onRefresh={refresh} record={medicine} />);
    await userEvent.click(screen.getByRole('button', { name: /Sửa hướng dẫn/ }));
    await userEvent.type(screen.getByLabelText('Hướng dẫn trên nhãn'), ' mới');
    expect(screen.getByRole('button', { name: 'Xác minh nhãn' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Duyệt liên kết' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hướng dẫn' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('không có quyền');
    expect(screen.getByLabelText('Hướng dẫn trên nhãn')).toHaveValue('Hướng dẫn kiểm thử mới');
    expect(refresh).not.toHaveBeenCalled();
  });
});

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MedicineUses } from '@/features/knowledge/MedicineUses';
import { medicine, pair, json } from '../../helpers/knowledge';

describe('medicine label review', () => {
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

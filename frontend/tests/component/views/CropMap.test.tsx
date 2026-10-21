import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SUPPORTED_PLANTS } from '@/data/plantData';
import { CROP_REGIONS } from '@/data/cropRegions';
import { CropMap } from '@/components/common/CropMap';
import { PlantsPage } from '@/views/PlantsPage';

describe('Vietnam crop map', () => {
  it('uses the real grape photo in the map marker and sourced region details', async () => {
    render(<CropMap plants={SUPPORTED_PLANTS} />);
    const user = userEvent.setup();
    const pin = screen.getByRole('button', { name: 'Xem Nho tại Ninh Thuận' });
    expect(
      decodeURIComponent(decodeURIComponent(pin.querySelector('img')?.getAttribute('src') ?? '')),
    ).toContain('nho banner.jpg');
    await user.click(pin);
    const dialog = screen.getByRole('dialog', { name: 'Ninh Thuận' });
    expect(within(dialog).getByRole('heading', { name: 'Nho' })).toBeVisible();
    expect(
      decodeURIComponent(
        decodeURIComponent(
          within(dialog).getByRole('img', { name: 'Ảnh minh họa cây Nho' }).getAttribute('src') ??
            '',
        ),
      ),
    ).toContain('nho banner.jpg');
    expect(within(dialog).getByRole('link', { name: 'Nguồn vùng trồng' })).toHaveAttribute(
      'href',
      expect.stringContaining('cong-bo-chi-dan-dia-ly-cho-san-pham-nho-ninh-thuan'),
    );
  });
  it('switches the selected region from the map inside the details window and restores the opening pin focus', async () => {
    render(<CropMap plants={SUPPORTED_PLANTS} />);
    const user = userEvent.setup();
    const openingPin = screen.getByRole('button', { name: 'Xem Cà phê tại Đắk Lắk' });
    await user.click(openingPin);
    const dialog = screen.getByRole('dialog', { name: 'Đắk Lắk' });
    const detailMap = within(dialog).getByRole('region', { name: 'Chọn địa điểm trên bản đồ' });
    const coffeePin = within(detailMap).getByRole('button', { name: 'Xem Cà phê tại Đắk Lắk' });
    const cornPin = within(detailMap).getByRole('button', { name: 'Xem Bắp (Ngô) tại Sơn La' });
    expect(coffeePin).toHaveAttribute('aria-pressed', 'true');
    await user.click(cornPin);
    expect(screen.getByRole('dialog', { name: 'Sơn La' })).toBe(dialog);
    expect(within(dialog).getByRole('heading', { name: 'Bắp (Ngô)' })).toBeVisible();
    expect(cornPin).toHaveAttribute('aria-pressed', 'true');
    expect(coffeePin).toHaveAttribute('aria-pressed', 'false');
    await user.keyboard('{Escape}');
    expect(openingPin).toHaveFocus();
  });

  it('represents every supported crop in a sourced region', () => {
    const regionCrops = CROP_REGIONS.flatMap((region) => region.crops);
    expect(new Set(regionCrops.map((crop) => crop.plantId))).toEqual(
      new Set(SUPPORTED_PLANTS.map((plant) => plant.id)),
    );
    expect(regionCrops.every((crop) => crop.sourceUrl.startsWith('https://'))).toBe(true);
  });

  it('shows a sourced regional crop and opens its existing catalog detail', async () => {
    const coffee = SUPPORTED_PLANTS.find((plant) => plant.id === 'coffee');
    const rice = SUPPORTED_PLANTS.find((plant) => plant.id === 'rice');
    if (!coffee || !rice) throw new Error('Missing catalog fixtures');

    const onSelectPlant = vi.fn();
    const user = userEvent.setup();
    render(<CropMap plants={[rice, coffee]} onSelectPlant={onSelectPlant} />);

    const map = screen.getByRole('region', { name: 'Bản đồ cây trồng Việt Nam' });
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(
      within(map).getByRole('button', { name: 'Xem Lúa nước tại Đồng bằng sông Cửu Long' }),
    );
    const riceDialog = screen.getByRole('dialog', { name: 'Đồng bằng sông Cửu Long' });
    expect(within(riceDialog).getByRole('heading', { name: 'Lúa nước' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(within(map).getByRole('button', { name: 'Xem Cà phê tại Đắk Lắk' }));
    const coffeeDialog = screen.getByRole('dialog', { name: 'Đắk Lắk' });
    expect(within(coffeeDialog).getByRole('heading', { name: 'Cà phê' })).toBeVisible();
    expect(within(coffeeDialog).getByRole('link', { name: 'Nguồn vùng trồng' })).toHaveAttribute(
      'href',
      expect.stringContaining('xay-dung-chuoi-nganh-hang-ca-phe-viet-nam-chat-luong-cao'),
    );
    const source = within(coffeeDialog).getByRole('link', { name: 'Nguồn vùng trồng' });
    expect(source).toHaveAttribute('target', '_blank');
    expect(source).toHaveAttribute('rel', 'noopener noreferrer');

    await user.click(within(coffeeDialog).getByRole('button', { name: 'Xem cây trong cẩm nang' }));
    expect(onSelectPlant).toHaveBeenCalledWith(coffee);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('switches crops inside the popup and resets the crop when a pin reopens', async () => {
    render(<CropMap plants={SUPPORTED_PLANTS} />);
    const user = userEvent.setup();
    const pin = screen.getByRole('button', { name: 'Xem Cà phê tại Đắk Lắk' });
    await user.click(pin);
    const dialog = screen.getByRole('dialog', { name: 'Đắk Lắk' });
    await user.click(within(dialog).getByRole('button', { name: 'Sầu riêng' }));
    expect(within(dialog).getByRole('heading', { name: 'Sầu riêng' })).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(pin).toHaveFocus();
    await user.click(pin);
    expect(screen.getByRole('dialog', { name: 'Đắk Lắk' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Cà phê' })).toBeVisible();
  });

  it('names the three requested island groups on the map', () => {
    render(<CropMap plants={SUPPORTED_PLANTS} />);

    const map = screen.getByRole('region', { name: 'Bản đồ cây trồng Việt Nam' });
    expect(within(map).getByText('Hoàng Sa')).toBeVisible();
    expect(within(map).getByText('Trường Sa')).toBeVisible();
    expect(within(map).getByText('Côn Đảo')).toBeVisible();
  });

  it('keeps the catalog focused on search and listings after the map moves', () => {
    render(
      <PlantsPage plants={SUPPORTED_PLANTS} onSelectPlant={vi.fn()} onDiagnosePlant={vi.fn()} />,
    );

    expect(screen.queryByRole('region', { name: 'Bản đồ cây trồng Việt Nam' })).toBeNull();
  });
});

import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { ActionButton } from '@/components/ui/ActionButton';
import { CodeField } from '@/components/ui/CodeField';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FilterSheet } from '@/components/ui/FilterSheet';
import { MediaPreview } from '@/components/ui/MediaPreview';
import { ResultSummary } from '@/components/ui/ResultSummary';
import { StatePanel } from '@/components/ui/StatePanel';
import { TextField } from '@/components/ui/TextField';
import { resolveReturnTarget } from '@/features/auth/returnTarget';
import { ComponentGalleryScreen } from '@/features/gallery/screens/ComponentGalleryScreen';

describe('Design system components (AGRI-196)', () => {
  it('ActionButton supports variants, disabled, and loading without double submit', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    const first = await render(<ActionButton label="Lưu lại" variant="destructive" onPress={onPress} />);
    await user.press(screen.getByRole('button', { name: 'Lưu lại' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    await first.unmount();

    const second = await render(<ActionButton label="Lưu lại" variant="destructive" loading onPress={onPress} />);
    const loadingBtn = screen.getByRole('button', { name: 'Lưu lại' });
    expect(loadingBtn).toBeDisabled();
    await user.press(loadingBtn);
    expect(onPress).toHaveBeenCalledTimes(1);
    await second.unmount();

    await render(<ActionButton label="Lưu lại" variant="ghost" disabled onPress={onPress} />);
    expect(screen.getByRole('button', { name: 'Lưu lại' })).toBeDisabled();
  });

  it('TextField toggles secure entry and announces errors', async () => {
    const onChangeText = jest.fn();
    const user = userEvent.setup();

    await render(
      <TextField
        label="Mật khẩu"
        value="secret"
        onChangeText={onChangeText}
        secureTextEntry
        error="Mật khẩu không hợp lệ."
      />,
    );

    const input = screen.getByLabelText('Mật khẩu');
    expect(input.props.secureTextEntry).toBe(true);
    await user.press(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(screen.getByLabelText('Mật khẩu').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('alert')).toHaveTextContent('Mật khẩu không hợp lệ.');
  });

  it('CodeField sanitizes pasted OTP digits to 8 characters and announces errors (F02-T2)', async () => {
    const onChangeText = jest.fn();
    const view = await render(<CodeField value="" onChangeText={onChangeText} />);

    await fireEvent.changeText(screen.getByLabelText('Mã xác minh 8 số'), '12-34 567890');
    expect(onChangeText).toHaveBeenCalledWith('12345678');

    await view.rerender(
      <CodeField value="12345678" onChangeText={onChangeText} error="Mã không hợp lệ." />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Mã không hợp lệ.');
  });

  it('StatePanel renders loading, empty, and error states with accessible actions', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    const view = await render(
      <StatePanel kind="loading" title="Đang tải" message="Vui lòng đợi." />,
    );
    expect(screen.getByRole('header', { name: 'Đang tải' })).toBeVisible();

    await view.rerender(
      <StatePanel
        kind="error"
        title="Lỗi kết nối"
        message="Không thể tải dữ liệu."
        actionLabel="Thử lại"
        onAction={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toBeVisible();
    await user.press(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('MediaPreview shows honest placeholders for loading, expired, and error', async () => {
    const onReplace = jest.fn();
    const view = await render(<MediaPreview status="expired" onReplace={onReplace} />);
    expect(screen.getByText('Ảnh gốc đã hết thời hạn lưu')).toBeVisible();

    await view.rerender(<MediaPreview status="error" />);
    expect(screen.getByText('Không thể hiển thị ảnh')).toBeVisible();

    await view.rerender(<MediaPreview status="loading" />);
    expect(screen.getByText('Đang chuẩn bị ảnh...')).toBeVisible();
  });

  it('ResultSummary formats confidence and enforces <= 0.80 threshold before rounding', async () => {
    const view = await render(
      <ResultSummary
        plantName="Cây lúa"
        conditionName="Đốm nâu"
        confidence={0.8}
        snapshotLabel="Bản lưu lịch sử"
      />,
    );
    expect(screen.getByText('80,0%')).toBeVisible();
    expect(screen.getByRole('alert')).toBeVisible();

    await view.rerender(
      <ResultSummary plantName="Cây lúa" conditionName="Khỏe mạnh" confidence={0.804} />,
    );
    expect(screen.getByText('80,4%')).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('FilterSheet keeps draft changes isolated until Apply and restores on Cancel', async () => {
    const onApply = jest.fn();
    const onCancel = jest.fn();
    const user = userEvent.setup();

    await render(
      <FilterSheet
        visible
        title="Lọc cây trồng"
        options={[
          { value: 'rice', label: 'Cây lúa' },
          { value: 'mango', label: 'Cây xoài' },
        ]}
        selectedValues={['rice']}
        onApply={onApply}
        onCancel={onCancel}
      />,
    );

    await user.press(screen.getByRole('checkbox', { name: 'Cây xoài' }));
    await user.press(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(onApply).toHaveBeenCalledWith(['rice', 'mango']);
  });

  it('ConfirmDialog disables Cancel while busy and displays error alert', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(
      <ConfirmDialog
        visible
        title="Xóa hồ sơ"
        message="Hành động này không thể hoàn tác."
        destructive
        busy
        error="Không thể xóa lúc này."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('button', { name: 'Xác nhận' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể xóa lúc này.');
  });

  it('ComponentGalleryScreen renders all design-system sections and interactive overlays', async () => {
    const user = userEvent.setup();
    await render(<ComponentGalleryScreen />);

    expect(screen.getByRole('header', { name: 'Component Gallery' })).toBeVisible();
    expect(screen.getByRole('header', { name: '1. Button' })).toBeVisible();
    expect(screen.getByRole('header', { name: '7. ResultSummary' })).toBeVisible();

    await user.press(screen.getByRole('button', { name: 'Mở FilterSheet' }));
    expect(screen.getByRole('header', { name: 'Lọc theo cây trồng' })).toBeVisible();
    await user.press(screen.getByRole('button', { name: 'Áp dụng' }));

    await user.press(screen.getByRole('button', { name: 'Mở ConfirmDialog' }));
    expect(screen.getByRole('header', { name: 'Xóa kết quả chẩn đoán' })).toBeVisible();
  });

  it('resolveReturnTarget only accepts whitelisted mobile routes (F02-T3)', () => {
    expect(resolveReturnTarget('/(tabs)/history')).toBe('/(tabs)/history');
    expect(resolveReturnTarget('/(tabs)/account')).toBe('/(tabs)/account');
    expect(resolveReturnTarget('https://evil.example')).toBe('/home');
    expect(resolveReturnTarget('//evil.example')).toBe('/home');
    expect(resolveReturnTarget('/admin/users')).toBe('/home');
    expect(resolveReturnTarget(undefined)).toBe('/home');
  });
});

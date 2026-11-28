import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { ProfileEditorScreen } from '@/features/profiles/screens/ProfileEditorScreen';

describe('S18 ProfileEditor (AGRI-175)', () => {
  it('S18-T1: blocks submit when name is whitespace-only or exceeds 150 characters', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();

    await render(
      <ProfileEditorScreen mode="create" onSave={onSave} onSaved={jest.fn()} onBack={jest.fn()} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Tên hồ sơ'), '   ');
    await user.press(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập tên hồ sơ.');
    expect(onSave).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Tên hồ sơ'), 'A'.repeat(151));
    await user.press(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Tên hồ sơ tối đa 150 ký tự.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('S18-T2: creates profile with trimmed { name, description } and calls onSaved', async () => {
    const savedProfile = {
      id: 'prof-new',
      name: 'Ruộng lúa OM18',
      description: 'Vụ Đông Xuân',
      predictionCount: 0,
      createdAt: '',
      updatedAt: '',
    };
    const onSave = jest.fn().mockResolvedValue({ kind: 'saved', profile: savedProfile });
    const onSaved = jest.fn();
    const user = userEvent.setup();

    await render(
      <ProfileEditorScreen mode="create" onSave={onSave} onSaved={onSaved} onBack={jest.fn()} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Tên hồ sơ'), '  Ruộng lúa OM18  ');
    await fireEvent.changeText(screen.getByLabelText('Mô tả (tùy chọn)'), '  Vụ Đông Xuân  ');
    await user.press(screen.getByRole('button', { name: 'Lưu hồ sơ' }));

    expect(onSave).toHaveBeenCalledWith({ name: 'Ruộng lúa OM18', description: 'Vụ Đông Xuân' });
    expect(onSaved).toHaveBeenCalledWith(savedProfile);
  });

  it('S18-T3: failed PUT preserves draft values and allows retry', async () => {
    const onSave = jest
      .fn()
      .mockResolvedValueOnce({ kind: 'error', reason: 'network' })
      .mockResolvedValueOnce({
        kind: 'saved',
        profile: { id: 'p-1', name: 'Tên đã sửa', description: null, predictionCount: 2, createdAt: '', updatedAt: '' },
      });
    const onSaved = jest.fn();
    const user = userEvent.setup();

    await render(
      <ProfileEditorScreen
        mode="edit"
        initialProfile={{ id: 'p-1', name: 'Tên cũ', description: null, predictionCount: 2, createdAt: '', updatedAt: '' }}
        onSave={onSave}
        onSaved={onSaved}
        onBack={jest.fn()}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Tên hồ sơ'), 'Tên đã sửa');
    await user.press(screen.getByRole('button', { name: 'Lưu hồ sơ' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa thể lưu hồ sơ. Vui lòng thử lại.');
    expect(screen.getByLabelText('Tên hồ sơ').props.value).toBe('Tên đã sửa');

    await user.press(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});

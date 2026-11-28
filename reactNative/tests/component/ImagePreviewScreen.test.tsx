import { render, screen, userEvent } from '@testing-library/react-native';

import { ImagePreviewScreen } from '@/features/diagnosis/screens/ImagePreviewScreen';

describe('S12 ImagePreview (AGRI-169)', () => {
  it('S12-T1: replacing image updates preview to only the second image', async () => {
    const view = await render(
      <ImagePreviewScreen
        image={{ uri: 'file:///first.jpg', fileName: 'first.jpg', mimeType: 'image/jpeg', fileSizeBytes: 500_000 }}
        isAuthenticated={false}
        selectedProfileId={null}
        onSelectProfileId={jest.fn()}
        onReplaceImage={jest.fn()}
        onBack={jest.fn()}
        onAnalyze={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Ảnh lá đã chọn: first.jpg')).toBeVisible();

    await view.rerender(
      <ImagePreviewScreen
        image={{ uri: 'file:///second.png', fileName: 'second.png', mimeType: 'image/png', fileSizeBytes: 750_000 }}
        isAuthenticated={false}
        selectedProfileId={null}
        onSelectProfileId={jest.fn()}
        onReplaceImage={jest.fn()}
        onBack={jest.fn()}
        onAnalyze={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText('Ảnh lá đã chọn: first.jpg')).toBeNull();
    expect(screen.getByLabelText('Ảnh lá đã chọn: second.png')).toBeVisible();
  });

  it('S12-T2: blocks upload and disables CTA when image exceeds 15 MiB', async () => {
    const onAnalyze = jest.fn();
    await render(
      <ImagePreviewScreen
        image={{ uri: 'file:///huge.jpg', fileName: 'huge.jpg', mimeType: 'image/jpeg', fileSizeBytes: 16 * 1024 * 1024 }}
        isAuthenticated={false}
        selectedProfileId={null}
        onSelectProfileId={jest.fn()}
        onReplaceImage={jest.fn()}
        onBack={jest.fn()}
        onAnalyze={onAnalyze}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/Ảnh vượt quá giới hạn 15 MiB/);
    expect(screen.getByRole('button', { name: 'Phân tích ảnh' })).toBeDisabled();
    expect(onAnalyze).not.toHaveBeenCalled();
  });

  it('S12-T3: User profile selection passes profileId to S13 while Guest omits it', async () => {
    const onSelectProfileId = jest.fn();
    const onAnalyze = jest.fn();
    const user = userEvent.setup();

    const view = await render(
      <ImagePreviewScreen
        image={{ uri: 'file:///leaf.jpg', fileName: 'leaf.jpg', mimeType: 'image/jpeg', fileSizeBytes: 800_000 }}
        isAuthenticated
        profiles={[
          { id: 'prof-1', name: 'Ruộng lúa OM18', description: null, predictionCount: 2, createdAt: '', updatedAt: '' },
        ]}
        selectedProfileId={null}
        onSelectProfileId={onSelectProfileId}
        onReplaceImage={jest.fn()}
        onBack={jest.fn()}
        onAnalyze={onAnalyze}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Hồ sơ nông nghiệp' }));
    await user.press(screen.getByRole('radio', { name: 'Ruộng lúa OM18' }));
    expect(onSelectProfileId).toHaveBeenCalledWith('prof-1');

    await view.rerender(
      <ImagePreviewScreen
        image={{ uri: 'file:///leaf.jpg', fileName: 'leaf.jpg', mimeType: 'image/jpeg', fileSizeBytes: 800_000 }}
        isAuthenticated={false}
        selectedProfileId="prof-1"
        onSelectProfileId={onSelectProfileId}
        onReplaceImage={jest.fn()}
        onBack={jest.fn()}
        onAnalyze={onAnalyze}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Hồ sơ nông nghiệp' })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Phân tích ảnh' }));
    expect(onAnalyze).toHaveBeenCalledWith(expect.objectContaining({ profileId: null }));
  });
});

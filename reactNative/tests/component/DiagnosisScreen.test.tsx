import { render, screen, userEvent } from '@testing-library/react-native';

import { DiagnosisDraftProvider, useDiagnosisDraft } from '@/features/diagnosis/diagnosisDraft';
import type { ImageSourceAdapter } from '@/features/diagnosis/imageSource';
import { DiagnosisScreen } from '@/features/diagnosis/screens/DiagnosisScreen';
import { Text } from 'react-native';

function DraftViewer() {
  const { draft } = useDiagnosisDraft();
  return <Text testID="draft-uri">{draft?.uri ?? 'none'}</Text>;
}

describe('S11 Diagnosis image source (AGRI-168)', () => {
  it('S11-T1: successful camera capture hands a single URI to S12', async () => {
    const onImageSelected = jest.fn();
    const adapter: ImageSourceAdapter = {
      pickFromCamera: jest.fn().mockResolvedValue({
        kind: 'selected',
        image: { uri: 'file:///leaf-1.jpg', fileName: 'leaf-1.jpg', mimeType: 'image/jpeg', fileSizeBytes: 512000 },
      }),
      pickFromLibrary: jest.fn(),
      openSettings: jest.fn(),
    };

    await render(<DiagnosisScreen adapter={adapter} onImageSelected={onImageSelected} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Chụp ảnh' }));

    expect(onImageSelected).toHaveBeenCalledWith(
      expect.objectContaining({ uri: 'file:///leaf-1.jpg', mimeType: 'image/jpeg' }),
    );
  });

  it('S11-T2: cancelling picker preserves existing draft without error', async () => {
    const adapter: ImageSourceAdapter = {
      pickFromCamera: jest.fn(),
      pickFromLibrary: jest.fn().mockResolvedValue({ kind: 'cancelled' }),
      openSettings: jest.fn(),
    };

    function Harness() {
      const { setDraft } = useDiagnosisDraft();
      return (
        <>
          <DraftViewer />
          <DiagnosisScreen adapter={adapter} onImageSelected={setDraft} />
        </>
      );
    }

    await render(
      <DiagnosisDraftProvider>
        <Harness />
      </DiagnosisDraftProvider>,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Chọn thư viện' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('draft-uri')).toHaveTextContent('none');
  });

  it('S11-T3: permanent permission denial shows settings guidance and opens Settings without crashing', async () => {
    const openSettings = jest.fn().mockResolvedValue(undefined);
    const adapter: ImageSourceAdapter = {
      pickFromCamera: jest.fn().mockResolvedValue({
        kind: 'permission-denied',
        source: 'camera',
        canAskAgain: false,
      }),
      pickFromLibrary: jest.fn(),
      openSettings,
    };

    const user = userEvent.setup();
    await render(<DiagnosisScreen adapter={adapter} onImageSelected={jest.fn()} />);

    await user.press(screen.getByRole('button', { name: 'Chụp ảnh' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Cho phép camera trong Cài đặt để chụp ảnh lá.');

    await user.press(screen.getByRole('button', { name: 'Mở Cài đặt' }));
    expect(openSettings).toHaveBeenCalledTimes(1);
  });
});

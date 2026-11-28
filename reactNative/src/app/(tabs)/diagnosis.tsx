import { router } from 'expo-router';

import { useDiagnosisDraft } from '@/features/diagnosis/diagnosisDraft';
import { defaultImageSourceAdapter } from '@/features/diagnosis/imageSource';
import { DiagnosisScreen } from '@/features/diagnosis/screens/DiagnosisScreen';

export default function DiagnosisRoute() {
  const { setDraft } = useDiagnosisDraft();
  return (
    <DiagnosisScreen
      adapter={defaultImageSourceAdapter}
      onImageSelected={(image) => {
        setDraft(image);
        router.push('/diagnosis/preview');
      }}
    />
  );
}

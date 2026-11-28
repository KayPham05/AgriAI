import { fetch } from 'expo/fetch';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useStartupSession } from '@/features/auth/StartupSession';
import { useDiagnosisDraft } from '@/features/diagnosis/diagnosisDraft';
import { ImagePreviewScreen } from '@/features/diagnosis/screens/ImagePreviewScreen';
import { fetchAgriculturalProfiles, type AgriculturalProfileItem } from '@/features/profiles/fetchAgriculturalProfiles';
import { sessionToken } from '@/lib/storage/sessionToken';

export default function ImagePreviewRoute() {
  const { session } = useStartupSession();
  const isUser = session.status === 'user';
  const { draft, profileId, setProfileId } = useDiagnosisDraft();
  const [profiles, setProfiles] = useState<AgriculturalProfileItem[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

  useEffect(() => {
    if (!isUser) return;
    const controller = new AbortController();
    void fetchAgriculturalProfiles({
      readToken: sessionToken.readToken,
      request: fetch,
      apiOrigin: process.env.EXPO_PUBLIC_API_URL,
      allowHttp: __DEV__,
      signal: controller.signal,
    }).then((res) => {
      if (controller.signal.aborted) return;
      setProfilesLoading(false);
      if (res.kind === 'loaded') setProfiles(res.profiles);
    });
    return () => controller.abort();
  }, [isUser]);

  return (
    <ImagePreviewScreen
      image={draft}
      isAuthenticated={isUser}
      profiles={profiles}
      profilesLoading={profilesLoading}
      selectedProfileId={profileId}
      onSelectProfileId={setProfileId}
      onReplaceImage={() => router.back()}
      onBack={() => router.back()}
      onAnalyze={() => {
        router.push('/diagnosis/analyzing');
      }}
    />
  );
}

import { fetch } from 'expo/fetch';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatePanel } from '@/components/ui/StatePanel';
import type { AgriculturalProfileItem } from '@/features/profiles/fetchAgriculturalProfiles';
import {
  createAgriculturalProfile,
  fetchAgriculturalProfileById,
  updateAgriculturalProfile,
} from '@/features/profiles/profileMutations';
import { ProfileEditorScreen } from '@/features/profiles/screens/ProfileEditorScreen';
import { sessionToken } from '@/lib/storage/sessionToken';

export default function ProfileEditorRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' && params.id.trim() ? params.id.trim() : null;
  const [initialProfile, setInitialProfile] = useState<AgriculturalProfileItem | null>(null);
  const [loading, setLoading] = useState(Boolean(id));

  const deps = useCallback(
    (signal?: AbortSignal) => ({
      readToken: sessionToken.readToken,
      request: fetch,
      apiOrigin: process.env.EXPO_PUBLIC_API_URL,
      allowHttp: __DEV__,
      signal,
    }),
    [],
  );

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void fetchAgriculturalProfileById(id, deps(controller.signal)).then((res) => {
      if (controller.signal.aborted) return;
      setLoading(false);
      if (res.kind === 'loaded') setInitialProfile(res.profile);
    });
    return () => controller.abort();
  }, [id, deps]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
        <StatePanel kind="loading" title="Đang tải hồ sơ" message="Vui lòng đợi trong giây lát." />
      </SafeAreaView>
    );
  }

  return (
    <ProfileEditorScreen
      mode={id ? 'edit' : 'create'}
      initialProfile={initialProfile}
      onSave={(payload) => (
        id
          ? updateAgriculturalProfile(id, payload, deps())
          : createAgriculturalProfile(payload, deps())
      )}
      onSaved={() => router.replace('/profiles')}
      onBack={() => router.back()}
    />
  );
}

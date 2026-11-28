import { fetch } from 'expo/fetch';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useStartupSession } from '@/features/auth/StartupSession';
import { fetchAgriculturalProfiles, type AgriculturalProfileItem } from '@/features/profiles/fetchAgriculturalProfiles';
import { AgriculturalProfilesScreen } from '@/features/profiles/screens/AgriculturalProfilesScreen';
import { sessionToken } from '@/lib/storage/sessionToken';

function ProfilesListBody({ userId }: { userId: string }) {
  const [profiles, setProfiles] = useState<AgriculturalProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetchAgriculturalProfiles({
      readToken: sessionToken.readToken,
      request: fetch,
      apiOrigin: process.env.EXPO_PUBLIC_API_URL,
      allowHttp: __DEV__,
      signal: controller.signal,
    }).then((res) => {
      if (controller.signal.aborted || res.kind === 'cancelled') return;
      setLoading(false);
      if (res.kind === 'loaded') {
        setError(undefined);
        setProfiles(res.profiles);
      } else {
        setError('Không thể tải danh sách hồ sơ.');
      }
    });
    return () => controller.abort();
  }, [userId, reloadTick]);

  return (
    <AgriculturalProfilesScreen
      profiles={profiles}
      loading={loading}
      error={error}
      onRefresh={() => {
        setLoading(true);
        setReloadTick((prev) => prev + 1);
      }}
      onCreate={() => router.push('/profiles/editor')}
      onSelectProfile={(id) => router.push({ pathname: '/profiles/[id]', params: { id } })}
      onBack={() => router.back()}
    />
  );
}

export default function AgriculturalProfilesRoute() {
  const { session } = useStartupSession();
  if (session.status !== 'user') return null;
  // Key by userId so switching users clears prior owner's profile list.
  return <ProfilesListBody key={session.userId} userId={session.userId} />;
}

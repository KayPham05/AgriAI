import { fetch } from 'expo/fetch';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import type { FilterOption } from '@/components/ui/FilterSheet';
import { useStartupSession } from '@/features/auth/StartupSession';
import { fetchHistoryList, type HistoryListItem } from '@/features/history/fetchHistoryList';
import { HistoryScreen } from '@/features/history/screens/HistoryScreen';
import { fetchAgriculturalProfiles } from '@/features/profiles/fetchAgriculturalProfiles';
import { sessionToken } from '@/lib/storage/sessionToken';

export default function HistoryRoute() {
  const { session } = useStartupSession();
  const isUser = session.status === 'user';
  const [items, setItems] = useState<HistoryListItem[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [profileOptions, setProfileOptions] = useState<FilterOption[]>([]);
  const [reloadTick, setReloadTick] = useState(0);

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
      if (res.kind === 'loaded') {
        setProfileOptions(res.profiles.map((p) => ({ value: p.id, label: p.name })));
      }
    });
    return () => controller.abort();
  }, [isUser]);

  useEffect(() => {
    if (!isUser) return;
    const controller = new AbortController();
    void fetchHistoryList({
      filter: { agriculturalProfileId: selectedProfiles[0] },
      pageNumber,
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
        setHasMore(res.hasMore);
        setItems((prev) => (res.pageNumber === 1 ? res.items : [...prev, ...res.items]));
      } else if (res.kind === 'invalid-filter') {
        setError(res.message);
      } else {
        setError('Không thể tải lịch sử. Vui lòng thử lại.');
      }
    });
    return () => controller.abort();
  }, [isUser, pageNumber, selectedProfiles, reloadTick]);

  return (
    <HistoryScreen
      isAuthenticated={isUser}
      items={items}
      loading={loading}
      loadingMore={loading && pageNumber > 1}
      error={error}
      hasMore={hasMore}
      filterOptions={profileOptions}
      selectedFilterValues={selectedProfiles}
      onApplyFilter={(values) => {
        setItems([]);
        setPageNumber(1);
        setLoading(true);
        setSelectedProfiles(values);
      }}
      onLoadMore={() => {
        setLoading(true);
        setPageNumber((prev) => prev + 1);
      }}
      onRefresh={() => {
        setLoading(true);
        setPageNumber(1);
        setReloadTick((prev) => prev + 1);
      }}
      onDiagnose={() => router.push('/(tabs)/diagnosis')}
      onLogin={() => router.push({ pathname: '/login', params: { returnTo: '/(tabs)/history' } })}
    />
  );
}

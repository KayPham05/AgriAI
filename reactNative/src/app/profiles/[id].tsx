import { fetch } from 'expo/fetch';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { fetchHistoryList, type HistoryListItem } from '@/features/history/fetchHistoryList';
import type { AgriculturalProfileItem } from '@/features/profiles/fetchAgriculturalProfiles';
import {
  deleteAgriculturalProfile,
  fetchAgriculturalProfileById,
} from '@/features/profiles/profileMutations';
import { AgriculturalProfileDetailScreen } from '@/features/profiles/screens/AgriculturalProfileDetailScreen';
import { sessionToken } from '@/lib/storage/sessionToken';

export default function AgriculturalProfileDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const [profile, setProfile] = useState<AgriculturalProfileItem | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryListItem[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string>();
  const [reloadTick, setReloadTick] = useState(0);

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
    const controller = new AbortController();
    void fetchAgriculturalProfileById(id, deps(controller.signal)).then((res) => {
      if (controller.signal.aborted || res.kind === 'cancelled') return;
      setLoading(false);
      if (res.kind === 'loaded') {
        setNotFound(false);
        setError(undefined);
        setProfile(res.profile);
      } else if (res.kind === 'not-found') {
        setNotFound(true);
      } else {
        setError('Không thể tải thông tin hồ sơ.');
      }
    });
    return () => controller.abort();
  }, [id, reloadTick, deps]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void fetchHistoryList({
      filter: { agriculturalProfileId: id },
      pageNumber,
      ...deps(controller.signal),
    }).then((res) => {
      if (controller.signal.aborted || res.kind === 'cancelled') return;
      setLoadingMore(false);
      if (res.kind === 'loaded') {
        setHasMore(res.hasMore);
        setHistoryItems((prev) => (res.pageNumber === 1 ? res.items : [...prev, ...res.items]));
      }
    });
    return () => controller.abort();
  }, [id, pageNumber, reloadTick, deps]);

  return (
    <AgriculturalProfileDetailScreen
      profile={profile}
      historyItems={historyItems}
      loading={loading}
      notFound={notFound}
      error={error}
      hasMoreHistory={hasMore}
      loadingMoreHistory={loadingMore}
      onLoadMoreHistory={() => {
        setLoadingMore(true);
        setPageNumber((prev) => prev + 1);
      }}
      onRetry={() => {
        setLoading(true);
        setReloadTick((prev) => prev + 1);
      }}
      onEdit={() => router.push({ pathname: '/profiles/editor', params: { id } })}
      onSelectPrediction={(predictionId) => router.push({ pathname: '/prediction/[id]', params: { id: predictionId } })}
      onDelete={() => deleteAgriculturalProfile(id, deps())}
      onDeleted={() => router.replace('/profiles')}
      onBack={() => router.back()}
    />
  );
}

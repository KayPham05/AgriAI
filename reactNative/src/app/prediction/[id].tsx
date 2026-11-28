import { fetch } from 'expo/fetch';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { PredictionResult } from '@/features/diagnosis/submitPrediction';
import {
  assignPredictionProfile,
  deletePrediction,
  fetchPredictionDetail,
  removePredictionProfile,
} from '@/features/history/predictionDetailApi';
import { PredictionDetailScreen } from '@/features/history/screens/PredictionDetailScreen';
import { fetchAgriculturalProfiles, type AgriculturalProfileItem } from '@/features/profiles/fetchAgriculturalProfiles';
import { sessionToken } from '@/lib/storage/sessionToken';

export default function PredictionDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const [detail, setDetail] = useState<PredictionResult | null>(null);
  const [profiles, setProfiles] = useState<AgriculturalProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
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
    void fetchPredictionDetail(id, deps(controller.signal)).then((res) => {
      if (controller.signal.aborted || res.kind === 'cancelled') return;
      setLoading(false);
      if (res.kind === 'loaded') {
        setNotFound(false);
        setError(undefined);
        setDetail(res.detail);
      } else if (res.kind === 'not-found') {
        setNotFound(true);
      } else {
        setError('Không thể tải chi tiết kết quả.');
      }
    });
    void fetchAgriculturalProfiles(deps(controller.signal)).then((res) => {
      if (!controller.signal.aborted && res.kind === 'loaded') setProfiles(res.profiles);
    });
    return () => controller.abort();
  }, [id, reloadTick, deps]);

  return (
    <PredictionDetailScreen
      detail={detail}
      loading={loading}
      notFound={notFound}
      error={error}
      profiles={profiles}
      onRetry={() => {
        setLoading(true);
        setReloadTick((prev) => prev + 1);
      }}
      onAssignProfile={async (nextProfileId) => {
        if (!detail) return { kind: 'error', reason: 'service' };
        const res = nextProfileId
          ? await assignPredictionProfile(detail.id, nextProfileId, deps())
          : detail.agriculturalProfileId
            ? await removePredictionProfile(detail.id, detail.agriculturalProfileId, deps())
            : ({ kind: 'ok' } as const);
        if (res.kind === 'ok') setReloadTick((prev) => prev + 1);
        return res;
      }}
      onDelete={() => deletePrediction(id, deps())}
      onDeleted={() => router.replace('/(tabs)/history')}
      onBack={() => router.back()}
    />
  );
}

'use client';
import { useEffect, useState } from 'react';
import { getPlants } from '@/services/catalogApi';
import type { Plant } from '@/types';

export function useActivePlants() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision retries the catalog request.
  useEffect(() => {
    const controller = new AbortController();
    setPlants([]);
    setLoading(true);
    setError('');
    getPlants(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setPlants(items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Chưa thể tải danh mục cây trồng.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  return { plants, error, loading, retry: () => setRevision((value) => value + 1) };
}

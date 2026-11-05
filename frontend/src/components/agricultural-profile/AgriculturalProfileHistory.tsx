'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getProfilePredictionHistory } from '@/services/predictionApi';
import type { DiagnosisResult } from '@/types';

export function AgriculturalProfileHistory({
  profileId,
  token,
  onView,
}: {
  profileId: string;
  token: string;
  onView: (result: DiagnosisResult) => Promise<void>;
}) {
  const [request, setRequest] = useState({ page: 1 });
  const [search, setSearch] = useState('');
  const [plantFilter, setPlantFilter] = useState('');
  const page = request.page;
  const [state, setState] = useState<{
    items: DiagnosisResult[];
    loading: boolean;
    error: string | null;
    hasNext: boolean;
  }>({ items: [], loading: true, error: null, hasNext: false });
  const plantOptions = useMemo(
    () =>
      [...new Set(state.items.map((item) => item.plant))].sort((a, b) => a.localeCompare(b, 'vi')),
    [state.items],
  );
  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi-VN');
    return state.items.filter((item) => {
      const matchesSearch =
        !query || `${item.plant} ${item.prediction}`.toLocaleLowerCase('vi-VN').includes(query);
      const matchesPlant = !plantFilter || item.plant === plantFilter;
      return matchesSearch && matchesPlant;
    });
  }, [plantFilter, search, state.items]);

  useEffect(() => {
    let active = true;
    setState({ items: [], loading: true, error: null, hasNext: false });
    getProfilePredictionHistory(profileId, token, request.page).then(
      (result) => {
        if (active)
          setState({
            items: result.items,
            loading: false,
            error: null,
            hasNext: result.hasNextPage,
          });
      },
      (cause: unknown) => {
        if (active)
          setState({
            items: [],
            loading: false,
            error: cause instanceof Error ? cause.message : 'Không thể tải lịch sử.',
            hasNext: false,
          });
      },
    );
    return () => {
      active = false;
    };
  }, [profileId, token, request]);

  return (
    <Card
      className="rounded-card border border-border bg-surface py-6 ring-0"
      aria-labelledby="profile-history-title"
    >
      <CardHeader className="gap-2 px-6">
        <CardTitle>
          <h2 id="profile-history-title" className="text-xl font-bold">
            Lịch sử chẩn đoán
          </h2>
        </CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Xem lại cây trồng và kết quả đã lưu theo từng lần kiểm tra lá.
        </p>
      </CardHeader>
      <CardContent className="px-6">
        {!state.loading && !state.error && state.items.length > 0 && (
          <div className="mb-5 grid gap-4 border-b border-border pb-5 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.55fr)] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="profile-history-search">Tìm trong lịch sử</Label>
              <Input
                id="profile-history-search"
                type="search"
                placeholder="Tên cây hoặc kết quả"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-history-plant">Lọc theo cây</Label>
              <select
                id="profile-history-plant"
                value={plantFilter}
                onChange={(event) => setPlantFilter(event.target.value)}
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
              >
                <option value="">Tất cả cây</option>
                {plantOptions.map((plant) => (
                  <option key={plant} value={plant}>
                    {plant}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {state.loading && (
          <p role="status" className="py-4 text-muted-foreground">
            Đang tải lịch sử…
          </p>
        )}
        {state.error && (
          <div role="alert" className="flex flex-wrap items-center gap-4 py-4">
            <p className="text-destructive">{state.error}</p>
            <Button variant="outline" onClick={() => setRequest((current) => ({ ...current }))}>
              Thử lại
            </Button>
          </div>
        )}
        {!state.loading && !state.error && state.items.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 px-5 py-8">
            <p className="font-semibold">Chưa có chẩn đoán trong hồ sơ này.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Kiểm tra lá rồi chọn lưu kết quả vào hồ sơ này để bắt đầu theo dõi.
            </p>
          </div>
        )}
        {!state.loading && !state.error && state.items.length > 0 && visibleItems.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-muted/40 px-5 py-8 text-muted-foreground">
            Không có kết quả phù hợp với bộ lọc hiện tại.
          </p>
        )}
        {visibleItems.length > 0 && (
          <ul className="divide-y divide-border border-t border-border">
            {visibleItems.map((result) => (
              <li
                key={result.id}
                className="flex min-w-0 flex-col items-start gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="grid min-w-0 gap-1">
                  <p className="break-words text-base font-semibold">{result.plant}</p>
                  <p className="break-words leading-6">{result.prediction}</p>
                  <p className="text-xs leading-5 text-muted-foreground">{result.timestamp}</p>
                </div>
                <Button variant="outline" className="shrink-0" onClick={() => void onView(result)}>
                  Xem kết quả đã lưu
                </Button>
              </li>
            ))}
          </ul>
        )}
        {!state.loading && !state.error && (page > 1 || state.hasNext) && (
          <>
            <Separator className="mb-4" />
            <nav
              aria-label="Phân trang lịch sử hồ sơ"
              className="flex flex-wrap items-center gap-4"
            >
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setRequest({ page: page - 1 })}
              >
                Trang trước
              </Button>
              <span>Trang {page}</span>
              <Button
                variant="outline"
                disabled={!state.hasNext}
                onClick={() => setRequest({ page: page + 1 })}
              >
                Trang sau
              </Button>
            </nav>
          </>
        )}
      </CardContent>
    </Card>
  );
}

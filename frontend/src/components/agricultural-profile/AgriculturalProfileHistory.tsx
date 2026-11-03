'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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
  const page = request.page;
  const [state, setState] = useState<{
    items: DiagnosisResult[];
    loading: boolean;
    error: string | null;
    hasNext: boolean;
  }>({ items: [], loading: true, error: null, hasNext: false });

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
    <Card className="rounded-card py-6 ring-0" aria-labelledby="profile-history-title">
      <CardHeader className="px-6">
        <CardTitle>
          <h2 id="profile-history-title" className="text-xl font-bold">
            Lịch sử chẩn đoán
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6">
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
          <p className="py-4 text-muted-foreground">Chưa có chẩn đoán trong hồ sơ này.</p>
        )}
        {state.items.length > 0 && (
          <ul className="divide-y divide-border border-t border-border">
            {state.items.map((result) => (
              <li key={result.id} className="grid items-center gap-3 py-4 sm:grid-cols-3 sm:gap-8">
                <p className="text-sm text-muted-foreground">{result.timestamp}</p>
                <p className="break-words font-semibold">{result.plant}</p>
                <Button
                  variant="link"
                  className="w-fit justify-start px-0"
                  onClick={() => void onView(result)}
                >
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

'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAdminActivity, type AdminActivity, type AdminDailyActivity } from '@/services/adminApi';
import { Button } from '@/components/ui/button';

export function useAdminActivity(token: string) {
  const [attempt, setAttempt] = useState(0);
  const request = useMemo(() => ({ token, attempt }), [token, attempt]);
  const [state, setState] = useState<{ data?: AdminActivity; error?: string }>({});
  useEffect(() => {
    const controller = new AbortController();
    setState({});
    getAdminActivity(request.token, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({ error: error instanceof Error ? error.message : 'Chưa thể tải biểu đồ.' });
      });
    return () => controller.abort();
  }, [request]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}

function shortDate(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

export function AdminMetricChart({
  days,
  field,
  title,
}: {
  days: AdminDailyActivity[];
  field: 'userCount' | 'imageCount' | 'sessionCount';
  title: string;
}) {
  const maximum = Math.max(0, ...days.map((day) => day[field]));
  const peak = Math.max(1, maximum);
  const total = days.reduce((sum, day) => sum + day[field], 0);
  const lastDay = days.at(-1);
  return (
    <div className="mt-2">
      <p className="text-xs leading-5">{title} · 7 ngày</p>
      <p className="mt-1 text-xs leading-4">Cao nhất/ngày: {maximum}</p>
      <div role="img" aria-label={`${title} theo ngày`} className="mt-1">
        <p className="sr-only">
          {total} trong 7 ngày. Biểu đồ dùng thang riêng từ 0 đến {peak}. Xem bảng số liệu bên dưới.
        </p>
        <div className="relative">
          <ol className="admin-chart-bars" aria-hidden="true">
            {days.map((day) => (
              <li
                key={day.date}
                title={`${shortDate(day.date)}: ${day[field]}`}
                className="flex min-w-0 flex-1 flex-col justify-end"
              >
                <span
                  className="admin-chart-bar"
                  style={{ height: `${(day[field] / peak) * 100}%` }}
                />
              </li>
            ))}
          </ol>
          {total === 0 && (
            <p
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center text-center text-xs"
            >
              Không có phát sinh
            </p>
          )}
        </div>
        <div aria-hidden="true" className="mt-1 flex justify-between gap-2 text-xs">
          <span>{days[0] ? shortDate(days[0].date) : ''}</span>
          <span>{lastDay ? shortDate(lastDay.date) : ''}</span>
        </div>
      </div>
      <details className="admin-chart-details text-xs">
        <summary className="flex min-h-11 cursor-pointer items-center rounded-lg underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          Xem số liệu theo ngày
        </summary>
        <table aria-label={`${title} theo ngày`} className="mt-2 w-full text-left">
          <thead>
            <tr>
              <th scope="col" className="py-2 font-medium">
                Ngày
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Số lượng
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date}>
                <th scope="row" className="py-1 font-normal">
                  {shortDate(day.date)}
                </th>
                <td className="py-1 text-right tabular-nums">{day[field]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export function AdminChartState({ error, retry }: { error?: string; retry: () => void }) {
  return (
    <div className="mt-4 flex flex-col items-start gap-2 text-xs">
      <p role={error ? 'alert' : 'status'}>
        {error ? 'Chưa thể tải biểu đồ.' : 'Đang tải biểu đồ...'}
      </p>
      {error && (
        <Button variant="outline" size="sm" onClick={retry}>
          Tải lại biểu đồ
        </Button>
      )}
    </div>
  );
}

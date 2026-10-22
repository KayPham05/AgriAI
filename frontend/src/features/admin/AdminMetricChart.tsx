'use client';

import type { CSSProperties } from 'react';
import type { AdminDailyActivity } from './adminTypes';

function shortDate(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

function monthLabel(date: string): string {
  return `T${Number(date.slice(5, 7))}`;
}

export function AdminMetricChart({
  days,
  field,
  title,
  granularity = 'day',
}: {
  days: AdminDailyActivity[];
  field: 'userCount' | 'imageCount' | 'sessionCount';
  title: string;
  granularity?: 'day' | 'month';
}) {
  const unit = granularity === 'month' ? 'tháng' : 'ngày';
  const label = (date: string) =>
    granularity === 'month' ? `${date.slice(5, 7)}/${date.slice(0, 4)}` : shortDate(date);
  const tickLabel = (date: string) =>
    granularity === 'month' ? monthLabel(date) : shortDate(date);
  const maximum = Math.max(0, ...days.map((day) => day[field]));
  const peak = Math.max(1, maximum);
  const total = days.reduce((sum, day) => sum + day[field], 0);
  return (
    <div className="mt-2">
      <p className="truncate text-xs leading-5" title={`${title} · ${days.length} ${unit}`}>
        {title} · {days.length} {unit}
      </p>
      <div role="img" aria-label={`${title} theo ${unit}`} className="mt-1">
        <p className="sr-only">
          {total} trong {days.length} {unit}. Biểu đồ dùng thang riêng từ 0 đến {peak}. Xem bảng số
          liệu bên dưới.
        </p>
        <div className="relative">
          <ol
            className="admin-chart-bars"
            style={{ '--admin-chart-columns': Math.max(1, days.length) } as CSSProperties}
            aria-hidden="true"
          >
            {days.map((day) => {
              const value = day[field];
              const heightPercent = (value / peak) * 100;
              return (
                <li
                  key={day.date}
                  title={`${label(day.date)}: ${value}`}
                  className="admin-chart-column"
                >
                  <span className="admin-chart-track">
                    {value > 0 && (
                      <span className="admin-chart-value" data-chart-value>
                        {value}
                      </span>
                    )}
                    <span className="admin-chart-bar" style={{ height: `${heightPercent}%` }} />
                  </span>
                  <span className="admin-chart-tick">
                    <time data-chart-label dateTime={day.date}>
                      {tickLabel(day.date)}
                    </time>
                  </span>
                </li>
              );
            })}
          </ol>
          {total === 0 && (
            <p
              aria-hidden="true"
              className="admin-chart-empty absolute inset-x-0 top-0 flex items-center justify-center text-center text-xs"
            >
              Không có phát sinh
            </p>
          )}
        </div>
      </div>
      <details className="admin-chart-details text-xs">
        <summary className="flex min-h-11 cursor-pointer items-center rounded-lg underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          Xem số liệu theo {unit}
        </summary>
        <table aria-label={`${title} theo ${unit}`} className="mt-2 w-full text-left">
          <thead>
            <tr>
              <th scope="col" className="py-2 font-medium">
                {granularity === 'month' ? 'Tháng' : 'Ngày'}
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
                  {label(day.date)}
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

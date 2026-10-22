'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { adminDateLabel, type AdminDateFilter } from './adminDateFilter';

export function vietnamToday(now = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function AdminCalendar({
  today = vietnamToday(),
  filter,
  onFilterChange,
}: {
  today?: string;
  filter?: AdminDateFilter | null;
  onFilterChange?: (filter: AdminDateFilter) => void;
}) {
  const [year, month] = today.split('-').map(Number);
  const [visible, setVisible] = useState({ year, month: month - 1 });
  const [mode, setMode] = useState<AdminDateFilter['mode']>('day');
  const yearStart = Math.floor(visible.year / 12) * 12;
  const title =
    mode === 'day'
      ? `Tháng ${visible.month + 1}, ${visible.year}`
      : mode === 'month'
        ? `Năm ${visible.year}`
        : `${yearStart} – ${yearStart + 11}`;
  const first = new Date(Date.UTC(visible.year, visible.month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(visible.year, visible.month + 1, 0)).getUTCDate();
  const weeks = Array.from({ length: Math.ceil((offset + length) / 7) }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = week * 7 + weekday - offset + 1;
      return day > 0 && day <= length ? day : null;
    }),
  );
  function moveMonth(delta: number) {
    const next = new Date(Date.UTC(visible.year, visible.month + delta, 1));
    setVisible({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  }
  function move(delta: number) {
    if (mode === 'day') moveMonth(delta);
    else
      setVisible((current) => ({
        ...current,
        year: current.year + delta * (mode === 'year' ? 12 : 1),
      }));
  }
  return (
    <section aria-label="Lịch tháng" className="admin-calendar-panel" data-admin-enter>
      <Card className="admin-panel gap-2">
        <CardHeader>
          <div className="flex items-center justify-between gap-1">
            <CardTitle>
              <h2 aria-live="polite" className="sr-only">
                {title}
              </h2>
              <div className="flex items-center gap-1">
                <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
                {onFilterChange ? (
                  <>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="px-1"
                      aria-label="Chọn tháng"
                      aria-expanded={mode === 'month'}
                      onClick={() => setMode(mode === 'month' ? 'day' : 'month')}
                    >
                      Tháng {visible.month + 1}
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="px-1"
                      aria-label="Chọn năm"
                      aria-expanded={mode === 'year'}
                      onClick={() => setMode(mode === 'year' ? 'day' : 'year')}
                    >
                      {visible.year}
                    </Button>
                  </>
                ) : (
                  <span>{title}</span>
                )}
              </div>
            </CardTitle>
            <div className="flex">
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  mode === 'day' ? 'Tháng trước' : mode === 'month' ? 'Năm trước' : '12 năm trước'
                }
                onClick={() => move(-1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  mode === 'day' ? 'Tháng sau' : mode === 'month' ? 'Năm sau' : '12 năm sau'
                }
                onClick={() => move(1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mode === 'day' ? (
            <table
              aria-label={title}
              className="admin-calendar w-full table-fixed text-center text-sm"
            >
              <thead>
                <tr>
                  {WEEKDAYS.map((day) => (
                    <th
                      key={day}
                      scope="col"
                      className="pb-1 text-xs font-medium text-muted-foreground"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr key={week.find((day) => day !== null)}>
                    {week.map((day, column) => {
                      const date = day
                        ? `${visible.year}-${String(visible.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        : '';
                      return (
                        <td key={WEEKDAYS[column]}>
                          {day ? (
                            onFilterChange ? (
                              <Button
                                variant={
                                  filter?.mode === 'day' && filter.value === date
                                    ? 'default'
                                    : date === today
                                      ? 'secondary'
                                      : 'ghost'
                                }
                                size="icon"
                                className="admin-calendar-day w-full min-w-0 px-0"
                                aria-label={`Ngày ${date.split('-').reverse().join('/')}`}
                                aria-pressed={filter?.mode === 'day' && filter.value === date}
                                disabled={date > today}
                                onClick={() => onFilterChange({ mode: 'day', value: date })}
                              >
                                <time
                                  dateTime={date}
                                  aria-current={date === today ? 'date' : undefined}
                                >
                                  {day}
                                </time>
                              </Button>
                            ) : (
                              <time
                                dateTime={date}
                                aria-current={date === today ? 'date' : undefined}
                                className={
                                  date === today
                                    ? 'mx-auto flex size-7 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground'
                                    : 'mx-auto flex size-7 items-center justify-center'
                                }
                              >
                                {day}
                              </time>
                            )
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <fieldset className="grid grid-cols-3 gap-2">
              <legend className="sr-only">{mode === 'month' ? 'Chọn tháng' : 'Chọn năm'}</legend>
              {Array.from({ length: 12 }, (_, index) => {
                const value =
                  mode === 'month'
                    ? `${visible.year}-${String(index + 1).padStart(2, '0')}`
                    : String(yearStart + index);
                const label =
                  mode === 'month' ? `Tháng ${index + 1}/${visible.year}` : `Năm ${value}`;
                return (
                  <Button
                    key={value}
                    size="xs"
                    variant={filter?.mode === mode && filter.value === value ? 'default' : 'ghost'}
                    aria-label={label}
                    aria-pressed={filter?.mode === mode && filter.value === value}
                    disabled={value > today.slice(0, mode === 'month' ? 7 : 4)}
                    onClick={() => {
                      onFilterChange?.({ mode, value });
                      if (mode === 'month') {
                        setVisible((current) => ({ ...current, month: index }));
                        setMode('day');
                      } else {
                        setVisible((current) => ({ ...current, year: Number(value) }));
                        setMode('month');
                      }
                    }}
                  >
                    {mode === 'month' ? `Tháng ${index + 1}` : value}
                  </Button>
                );
              })}
            </fieldset>
          )}
        </CardContent>
        <CardFooter className="admin-panel-footer flex-wrap justify-between gap-2 py-2">
          <p className="text-xs text-muted-foreground">
            {filter ? adminDateLabel(filter) : today.split('-').reverse().join('/')} · UTC+7
          </p>
          <Button
            variant="ghost"
            size="sm"
            aria-label={
              mode === 'day'
                ? 'Về tháng hiện tại'
                : mode === 'month'
                  ? 'Về năm hiện tại'
                  : 'Về nhóm năm hiện tại'
            }
            onClick={() => {
              setVisible({ year, month: month - 1 });
              onFilterChange?.({
                mode,
                value: today.slice(0, mode === 'day' ? 10 : mode === 'month' ? 7 : 4),
              });
            }}
          >
            {mode === 'day' ? 'Hôm nay' : mode === 'month' ? 'Tháng này' : 'Năm nay'}
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}

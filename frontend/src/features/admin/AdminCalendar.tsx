'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

export function vietnamToday(now = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function AdminCalendar({ today = vietnamToday() }: { today?: string }) {
  const [year, month] = today.split('-').map(Number);
  const [visible, setVisible] = useState({ year, month: month - 1 });
  const title = `Tháng ${visible.month + 1}, ${visible.year}`;
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
  return (
    <section aria-label="Lịch tháng" data-admin-enter>
      <Card className="admin-panel gap-2">
        <CardHeader>
          <div className="flex items-center justify-between gap-1">
            <CardTitle>
              <h2 aria-live="polite" className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
                {title}
              </h2>
            </CardTitle>
            <div className="flex">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Tháng trước"
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Tháng sau"
                onClick={() => moveMonth(1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
        <CardFooter className="admin-panel-footer flex-wrap justify-between gap-2 py-2">
          <p className="text-xs text-muted-foreground">
            {today.split('-').reverse().join('/')} · UTC+7
          </p>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Về tháng hiện tại"
            onClick={() => setVisible({ year, month: month - 1 })}
          >
            Hôm nay
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}

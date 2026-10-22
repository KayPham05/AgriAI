import { useAdminMock } from './AdminMockProvider';
import { useState } from 'react';
import { Users, Images, Monitor, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { AdminOverviewCalendar } from './AdminOverviewCalendar';
import { AdminMetricChart } from './AdminMetricChart';
import { AdminRecentImages } from './AdminOverviewPanels';
import { buildAdminOverviewStats } from './adminOverviewStats';
import { adminDateLabel, type AdminDateFilter } from './adminDateFilter';

const METRICS = [
  {
    title: 'Người dùng',
    icon: Users,
    field: 'userCount',
    trend: 'Tài khoản mới',
    todayLabel: 'mới hôm nay',
  },
  {
    title: 'Ảnh đã tải lên',
    icon: Images,
    field: 'imageCount',
    trend: 'Ảnh tải lên',
    todayLabel: 'tải lên hôm nay',
  },
  {
    title: 'Phiên đăng nhập',
    icon: Monitor,
    field: 'sessionCount',
    trend: 'Lượt đăng nhập',
    todayLabel: 'lượt hôm nay',
  },
] as const;

export function AdminOverview({
  onImages,
  onUsers,
  onSessions,
}: {
  onImages: () => void;
  onUsers: () => void;
  onSessions: () => void;
}) {
  const data = useAdminMock();
  const [asOf, setAsOf] = useState(() => new Date());
  const [notice, setNotice] = useState('');
  const [dateFilter, setDateFilter] = useState<AdminDateFilter | null>(null);
  const stats = buildAdminOverviewStats(data, asOf, dateFilter);
  return (
    <div className="admin-overview min-h-0 flex-1 overflow-auto p-1">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p role="status" aria-label="Bộ lọc thời gian" className="text-xs text-muted-foreground">
            {dateFilter
              ? `${dateFilter.mode === 'day' ? 'Ngày' : dateFilter.mode === 'month' ? 'Tháng' : 'Năm'} ${adminDateLabel(dateFilter)}`
              : 'Toàn bộ · Biểu đồ 7 ngày gần nhất'}
          </p>
          {dateFilter && (
            <Button
              variant="ghost"
              size="xs"
              aria-label="Bỏ lọc thời gian"
              onClick={() => setDateFilter(null)}
            >
              Bỏ lọc
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Cập nhật{' '}
            <time dateTime={asOf.toISOString()}>
              {asOf.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Ho_Chi_Minh',
              })}
            </time>{' '}
            · UTC+7
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Làm mới số liệu minh họa"
            title="Cập nhật từ dữ liệu minh họa hiện có"
            onClick={() => {
              setAsOf(new Date());
              setNotice('Đã cập nhật từ dữ liệu minh họa hiện có.');
            }}
          >
            <RefreshCw aria-hidden="true" />
          </Button>
        </div>
      </div>
      <p role="status" aria-label="Cập nhật số liệu" className="sr-only">
        {notice}
      </p>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-3 lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            {METRICS.map(({ title, icon: Icon, field, trend, todayLabel }, index) => (
              <section key={title} aria-label={title} data-admin-enter className="min-w-0">
                <Card
                  className={
                    index === 0
                      ? 'admin-panel admin-stat admin-stat-primary h-full'
                      : 'admin-panel admin-stat h-full'
                  }
                >
                  <CardContent>
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-sm font-medium leading-6">{title}</h2>
                      <Icon className="size-5 shrink-0" aria-hidden="true" />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-3xl font-semibold tracking-tight">
                        {stats.totals[field].toLocaleString('vi-VN')}
                      </p>
                      <div className="text-right text-xs leading-4">
                        <p>
                          {dateFilter
                            ? `Trong ${dateFilter.mode === 'day' ? 'ngày' : dateFilter.mode === 'month' ? 'tháng' : 'năm'} đã chọn`
                            : `${stats.today[field]} ${todayLabel}`}
                        </p>
                        {field === 'sessionCount' && (
                          <p
                            className="mt-1"
                            title="Phiên chưa kết thúc và chưa hết hạn, không phải số người đang online"
                          >
                            {stats.activeSessionCount}{' '}
                            {dateFilter ? 'hiện còn hiệu lực' : 'còn hiệu lực'}
                          </p>
                        )}
                      </div>
                    </div>
                    <AdminMetricChart
                      days={stats.days}
                      field={field}
                      title={trend}
                      granularity={dateFilter?.mode === 'year' ? 'month' : 'day'}
                    />
                  </CardContent>
                </Card>
              </section>
            ))}
          </div>
          <AdminRecentImages onImages={onImages} dateFilter={dateFilter} asOf={asOf} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <AdminOverviewCalendar filter={dateFilter} onFilterChange={setDateFilter} />
          <section aria-label="Cần chú ý" data-admin-enter>
            <Card className="admin-panel admin-attention">
              <CardHeader>
                <CardTitle>
                  <h2>Cần chú ý</h2>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Trạng thái hiện tại, không theo bộ lọc
                </p>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex flex-col gap-1">
                    <dt>Tài khoản bị khóa</dt>
                    <dd className="font-semibold tabular-nums">{stats.lockedUserCount}</dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt>Cảnh báo đã gửi</dt>
                    <dd className="font-semibold tabular-nums">{stats.warningCount}</dd>
                  </div>
                </dl>
                {stats.lockedUserCount === 0 && stats.warningCount === 0 && (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Chưa ghi nhận tài khoản bị khóa hoặc cảnh báo.
                  </p>
                )}
              </CardContent>
              <CardFooter className="admin-panel-footer flex flex-wrap gap-1 py-1">
                <Button variant="ghost" size="xs" onClick={onUsers}>
                  Xem tài khoản
                </Button>
                <Button variant="ghost" size="xs" onClick={onSessions}>
                  Xem phiên
                </Button>
              </CardFooter>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

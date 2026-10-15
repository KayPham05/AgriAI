import { ArrowUpRight, Users, Images, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminSummary } from '@/services/adminApi';
import type { AuthUser } from '@/services/authApi';
import { AdminCalendar } from './AdminCalendar';
import { AdminMetricChart, AdminChartState, useAdminActivity } from './AdminMetricChart';
import { AdminAccountCard, AdminRecentImages, AdminRecentSessions } from './AdminOverviewPanels';

const METRICS = [
  { title: 'Người dùng', icon: Users, field: 'userCount', trend: 'Tài khoản mới' },
  { title: 'Ảnh đã tải lên', icon: Images, field: 'imageCount', trend: 'Ảnh tải lên' },
  { title: 'Phiên đăng nhập', icon: Monitor, field: 'sessionCount', trend: 'Lượt đăng nhập' },
] as const;

export function AdminOverview({
  summary,
  token,
  user,
  onUsers,
  onImages,
  onSessions,
}: {
  summary?: AdminSummary;
  token: string;
  user: AuthUser;
  onUsers: () => void;
  onImages: () => void;
  onSessions: () => void;
}) {
  const activity = useAdminActivity(token);
  const areas = [
    {
      title: 'Người dùng',
      description: 'Khóa, khôi phục và gửi cảnh báo tài khoản.',
      action: 'Xem người dùng',
      onClick: onUsers,
      icon: Users,
    },
    {
      title: 'Ảnh đã tải lên',
      description: 'Kiểm duyệt ảnh và cảnh báo người đăng.',
      action: 'Xem ảnh',
      onClick: onImages,
      icon: Images,
    },
    {
      title: 'Phiên đăng nhập',
      description: 'Theo dõi các phiên truy cập hệ thống.',
      action: 'Xem phiên đăng nhập',
      onClick: onSessions,
      icon: Monitor,
    },
  ];
  return (
    <div className="grid items-start gap-4 xl:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {METRICS.map(({ title, icon: Icon, field, trend }, index) => (
            <section
              key={title}
              aria-label={title}
              data-admin-enter
              className={index === 0 ? 'col-span-2 sm:col-span-1' : undefined}
            >
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
                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {summary ? (
                      summary[field].toLocaleString('vi-VN')
                    ) : (
                      <>
                        <span aria-hidden="true">-</span>
                        <span className="sr-only">Chưa có số liệu</span>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-xs leading-4">
                    {summary ? 'Tổng bản ghi' : 'Chưa có số liệu'}
                  </p>
                  {activity.data ? (
                    <AdminMetricChart days={activity.data.days} field={field} title={trend} />
                  ) : (
                    <AdminChartState error={activity.error} retry={activity.retry} />
                  )}
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
        <section aria-label="Các mục quản trị" data-admin-enter>
          <Card className="admin-panel">
            <CardContent>
              <h2 className="mb-1 text-base font-semibold">Quản lý hệ thống</h2>
              <div className="divide-y divide-border">
                {areas.map(({ title, description, action, onClick, icon: Icon }) => (
                  <div
                    key={title}
                    className="admin-action-row flex flex-wrap items-center justify-between gap-3 py-3 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">{title}</h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {description}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" onClick={onClick}>
                      {action}
                      <ArrowUpRight data-icon="inline-end" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
        <AdminRecentImages token={token} onImages={onImages} />
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-1">
        <AdminCalendar />
        <AdminAccountCard user={user} />
        <AdminRecentSessions token={token} onSessions={onSessions} />
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAdminPage, type AdminPage } from '@/services/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function formatAdminDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Không có thời gian' : date.toLocaleString('vi-VN');
}

export function AdminRecordList<T extends { id: string }>({
  resource,
  token,
  title,
  empty,
  children,
  revision = 0,
  initialQuery = '',
}: {
  resource: 'users' | 'images' | 'sessions';
  token: string;
  title: string;
  empty: string;
  children: (item: T) => ReactNode;
  revision?: number;
  initialQuery?: string;
}) {
  const [request, setRequest] = useState({ page: 1, q: initialQuery });
  const [draft, setDraft] = useState(initialQuery);
  const source = useMemo(() => ({ resource, token, revision }), [resource, token, revision]);
  const [state, setState] = useState<{ data?: AdminPage<T>; error?: string; loading: boolean }>({
    loading: true,
  });
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    getAdminPage<T>(source.resource, source.token, request.page, request.q, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            loading: false,
            error: error instanceof Error ? error.message : 'Không thể tải dữ liệu quản trị.',
          });
      });
    return () => controller.abort();
  }, [source, request]);
  return (
    <section aria-label={title} className="flex flex-col gap-6">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setRequest({ page: 1, q: draft });
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Label htmlFor={`admin-search-${resource}`}>Tìm theo tên hoặc email người dùng</Label>
          <Input
            id={`admin-search-${resource}`}
            value={draft}
            maxLength={150}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          Tìm kiếm
        </Button>
      </form>
      {state.loading && <p role="status">Đang tải dữ liệu...</p>}
      {state.error && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-destructive">
            {state.error}
          </p>
          <Button variant="outline" onClick={() => setRequest((current) => ({ ...current }))}>
            Thử lại
          </Button>
        </div>
      )}
      {state.data && (
        <>
          <p className="text-sm text-muted-foreground">{state.data.totalCount} bản ghi</p>
          {state.data.items.length === 0 ? (
            <p role="status" className="py-10 text-center text-muted-foreground">
              {request.q ? 'Không tìm thấy kết quả phù hợp.' : empty}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {state.data.items.map((item) => (
                <li key={item.id} className="py-5">
                  {children(item)}
                </li>
              ))}
            </ul>
          )}
          {state.data.totalPages > 0 && (
            <nav
              aria-label="Phân trang dữ liệu"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <p className="text-sm text-muted-foreground">
                Trang {state.data.pageNumber} / {state.data.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={!state.data.hasPreviousPage}
                  onClick={() => setRequest((current) => ({ ...current, page: current.page - 1 }))}
                >
                  Trang trước
                </Button>
                <Button
                  variant="outline"
                  disabled={!state.data.hasNextPage}
                  onClick={() => setRequest((current) => ({ ...current, page: current.page + 1 }))}
                >
                  Trang sau
                </Button>
              </div>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

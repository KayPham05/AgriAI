import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminPageSize } from './useAdminPageSize';

const SEARCH_DEBOUNCE_MS = 500;

export function formatAdminDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Không có thời gian' : date.toLocaleString('vi-VN');
}

interface SearchableRecord {
  id: string;
  fullName?: string;
  email?: string;
  userName?: string;
  userEmail?: string;
}
function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}

export function AdminRecordList<T extends SearchableRecord>({
  resource,
  items,
  title,
  empty,
  children,
  initialQuery = '',
}: {
  resource: 'users' | 'images' | 'sessions';
  items: T[];
  title: string;
  empty: string;
  children: (item: T) => ReactNode;
  initialQuery?: string;
}) {
  const [request, setRequest] = useState({ page: 1, q: initialQuery });
  const [draft, setDraft] = useState(initialQuery);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (searchTimer.current !== null) clearTimeout(searchTimer.current);
    };
  }, []);
  function cancelPendingSearch() {
    if (searchTimer.current !== null) clearTimeout(searchTimer.current);
    searchTimer.current = null;
  }
  const pageSize = useAdminPageSize(2);
  const query = normalize(request.q.trim());
  const filtered = items.filter((item) =>
    normalize(
      `${item.fullName ?? item.userName ?? ''} ${item.email ?? item.userEmail ?? ''}`,
    ).includes(query),
  );
  const totalPages = Math.ceil(filtered.length / pageSize);
  const page = Math.min(request.page, Math.max(1, totalPages));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  return (
    <section aria-label={title} className="admin-record-list flex min-h-0 flex-1 flex-col gap-3">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          cancelPendingSearch();
          setRequest({ page: 1, q: draft });
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Label htmlFor={`admin-search-${resource}`}>Tìm theo tên hoặc email người dùng</Label>
          <Input
            id={`admin-search-${resource}`}
            value={draft}
            maxLength={150}
            onChange={(event) => {
              const value = event.target.value;
              setDraft(value);
              cancelPendingSearch();
              searchTimer.current = setTimeout(() => {
                searchTimer.current = null;
                setRequest({ page: 1, q: value });
              }, SEARCH_DEBOUNCE_MS);
            }}
          />
        </div>
        <Button type="submit" variant="outline">
          Tìm kiếm
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">{filtered.length} bản ghi minh họa</p>
      {visible.length === 0 ? (
        <p role="status" className="py-10 text-center text-muted-foreground">
          {request.q ? 'Không tìm thấy kết quả phù hợp.' : empty}
        </p>
      ) : (
        <ul className="admin-records grid min-h-0 flex-1 items-start gap-4 overflow-auto md:grid-cols-2">
          {visible.map((item) => (
            <li key={item.id} className="min-w-0 rounded-xl border border-border bg-surface p-4">
              {children(item)}
            </li>
          ))}
        </ul>
      )}
      {totalPages > 0 && (
        <nav
          aria-label="Phân trang dữ liệu"
          className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border pt-2"
        >
          <p className="text-sm text-muted-foreground">
            Trang {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setRequest((current) => ({ ...current, page: page - 1 }))}
            >
              Trang trước
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setRequest((current) => ({ ...current, page: page + 1 }))}
            >
              Trang sau
            </Button>
          </div>
        </nav>
      )}
    </section>
  );
}

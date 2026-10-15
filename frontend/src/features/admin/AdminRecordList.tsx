import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
const PAGE_SIZE = 10;
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
  const query = normalize(request.q.trim());
  const filtered = items.filter((item) =>
    normalize(
      `${item.fullName ?? item.userName ?? ''} ${item.email ?? item.userEmail ?? ''}`,
    ).includes(query),
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const page = Math.min(request.page, Math.max(1, totalPages));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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
      <p className="text-sm text-muted-foreground">{filtered.length} bản ghi minh họa</p>
      {visible.length === 0 ? (
        <p role="status" className="py-10 text-center text-muted-foreground">
          {request.q ? 'Không tìm thấy kết quả phù hợp.' : empty}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {visible.map((item) => (
            <li key={item.id} className="py-5">
              {children(item)}
            </li>
          ))}
        </ul>
      )}
      {totalPages > 0 && (
        <nav
          aria-label="Phân trang dữ liệu"
          className="flex flex-wrap items-center justify-between gap-3"
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

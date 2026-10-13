import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CatalogPaginationProps {
  label: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function CatalogPagination({
  label,
  currentPage,
  totalPages,
  onPageChange,
}: CatalogPaginationProps) {
  if (totalPages <= 1) return null;
  const visibleCount = Math.min(3, totalPages);
  const firstPage = Math.max(1, Math.min(currentPage - 1, totalPages - visibleCount + 1));
  const pages = Array.from({ length: visibleCount }, (_, index) => firstPage + index);

  return (
    <nav aria-label={label} className="mt-8 flex flex-col items-center gap-3">
      <ul className="flex items-center gap-2">
        <li>
          <Button
            type="button"
            variant="outline"
            aria-label="Trang trước"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="px-3 sm:px-5"
          >
            <ChevronLeft data-icon="inline-start" />
            <span className="hidden sm:inline">Trước</span>
          </Button>
        </li>
        {pages.map((page) => (
          <li key={page}>
            <Button
              type="button"
              size="icon"
              variant={page === currentPage ? 'default' : 'outline'}
              aria-label={`Trang ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          </li>
        ))}
        <li>
          <Button
            type="button"
            variant="outline"
            aria-label="Trang sau"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="px-3 sm:px-5"
          >
            <span className="hidden sm:inline">Sau</span>
            <ChevronRight data-icon="inline-end" />
          </Button>
        </li>
      </ul>
      <p className="text-sm tabular-nums text-muted-foreground">
        Trang {currentPage} / {totalPages}
      </p>
    </nav>
  );
}

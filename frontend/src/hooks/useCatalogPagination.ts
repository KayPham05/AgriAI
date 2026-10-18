import { useRef, useState } from 'react';

const PAGE_SIZE = 9;

export function useCatalogPagination<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const resultsRef = useRef<HTMLParagraphElement>(null);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  function changePage(nextPage: number) {
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  return {
    currentPage,
    totalPages,
    visibleItems: items.slice(offset, offset + PAGE_SIZE),
    firstItem: items.length === 0 ? 0 : offset + 1,
    lastItem: Math.min(offset + PAGE_SIZE, items.length),
    resultsRef,
    changePage,
    resetPage: () => setPage(1),
  };
}

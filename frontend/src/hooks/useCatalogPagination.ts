import { useRef, useState, useSyncExternalStore } from 'react';

const TABLET_QUERY = '(min-width: 768px)';
const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribeToGrid(notify: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const queries = [window.matchMedia(TABLET_QUERY), window.matchMedia(DESKTOP_QUERY)];
  for (const query of queries) query.addEventListener('change', notify);
  return () => {
    for (const query of queries) query.removeEventListener('change', notify);
  };
}

function getPageSize() {
  if (typeof window.matchMedia !== 'function') return 6;
  if (window.matchMedia(DESKTOP_QUERY).matches) return 6;
  return window.matchMedia(TABLET_QUERY).matches ? 4 : 2;
}

const getServerPageSize = () => 6;

export function useCatalogPagination<T>(items: T[]) {
  const [page, setPage] = useState(1);
  // Match the catalog's 1/2/3-column grid, with at most two rows per page.
  const pageSize = useSyncExternalStore(subscribeToGrid, getPageSize, getServerPageSize);
  const resultsRef = useRef<HTMLParagraphElement>(null);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;

  function changePage(nextPage: number) {
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  return {
    currentPage,
    totalPages,
    visibleItems: items.slice(offset, offset + pageSize),
    firstItem: items.length === 0 ? 0 : offset + 1,
    lastItem: Math.min(offset + pageSize, items.length),
    resultsRef,
    changePage,
    resetPage: () => setPage(1),
  };
}

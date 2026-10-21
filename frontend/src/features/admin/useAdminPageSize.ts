'use client';

import { useEffect, useState } from 'react';

export function useAdminPageSize(desktopSize: number) {
  const [pageSize, setPageSize] = useState(desktopSize);
  useEffect(() => {
    function update() {
      setPageSize(window.innerWidth < 768 ? 1 : window.innerWidth < 1280 ? 2 : desktopSize);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [desktopSize]);
  return pageSize;
}

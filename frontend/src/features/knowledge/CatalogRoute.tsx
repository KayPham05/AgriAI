import { Suspense } from 'react';
import type { CatalogKind } from '@/services/knowledgeApi';
import { PublicCatalog } from './PublicCatalog';
export function CatalogRoute({ kind, id }: { kind: CatalogKind; id?: string }) {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6">
          Đang tải danh mục...
        </p>
      }
    >
      <PublicCatalog kind={kind} id={id} />
    </Suspense>
  );
}

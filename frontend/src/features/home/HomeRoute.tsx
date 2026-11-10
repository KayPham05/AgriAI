'use client';
import { HomePage } from '@/views/HomePage';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useActivePlants } from '@/hooks/useActivePlants';
import { Button } from '@/components/ui/button';
export function HomeRoute() {
  const { navigate, selectPlant } = useAppNavigation();
  const catalog = useActivePlants();
  return (
    <>
      {catalog.error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 p-4">
          {catalog.error}
          <Button variant="outline" onClick={catalog.retry}>
            Thử lại
          </Button>
        </div>
      )}
      {catalog.loading && (
        <p role="status" className="px-4 py-2 text-sm text-muted-foreground">
          Đang tải danh mục cây...
        </p>
      )}
      <HomePage plants={catalog.plants} onNavigate={navigate} onSelectPlant={selectPlant} />
    </>
  );
}

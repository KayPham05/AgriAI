'use client';
import { RouteError } from '@/components/common/RouteError';
import '../index.css';
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="vi">
      <body>
        <RouteError retry={retry} />
      </body>
    </html>
  );
}

'use client';
import { RouteError } from '@/components/common/RouteError';
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <RouteError retry={retry} />;
}

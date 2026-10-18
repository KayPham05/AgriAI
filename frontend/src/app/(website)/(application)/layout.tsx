import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function ApplicationLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

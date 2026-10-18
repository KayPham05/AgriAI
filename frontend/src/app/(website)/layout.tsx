import type { ReactNode } from 'react';
import { AppProvider } from '@/providers/AppProvider';

export default function WebsiteLayout({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

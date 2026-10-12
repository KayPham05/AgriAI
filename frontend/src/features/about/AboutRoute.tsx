'use client';
import { AboutAiPage } from '@/views/AboutAiPage';
import { useAppNavigation } from '@/hooks/useAppNavigation';
export function AboutRoute() {
  const { diagnose } = useAppNavigation();
  return <AboutAiPage onNavigateDiagnose={diagnose} />;
}

import type { NavigationTab } from '../types';

const TAB_PATHS: Record<NavigationTab, string> = {
  home: '/home',
  diagnose: '/diagnose',
  plants: '/plants',
  'plant-detail': '/plants',
  diseases: '/diseases',
  'disease-detail': '/diseases',
  knowledge: '/knowledge',
  medicines: '/medicines',
  history: '/history',
  about: '/about',
  profile: '/profile',
};

export function getTabPath(tab: NavigationTab): string {
  return TAB_PATHS[tab];
}

export function getDetailPath(kind: 'plants' | 'diseases', id: string): string {
  return `/${kind}/${encodeURIComponent(id)}`;
}

export function getAppRoute(pathname: string): { tab: NavigationTab; detailId: string | null } {
  const segments = pathname.split('/').filter(Boolean);
  const tab =
    (Object.keys(TAB_PATHS) as NavigationTab[]).find(
      (key) => TAB_PATHS[key] === `/${segments[0]}`,
    ) ?? 'home';
  let detailId: string | null = null;
  if (['plants', 'diseases', 'knowledge', 'medicines'].includes(tab) && segments.length === 2) {
    try {
      detailId = decodeURIComponent(segments[1]);
    } catch {
      detailId = segments[1];
    }
  }
  return { tab, detailId };
}

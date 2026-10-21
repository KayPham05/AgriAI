import { useState, useSyncExternalStore } from 'react';
import { ChevronDown } from 'lucide-react';
import { AdminCalendar } from './AdminCalendar';
import type { ComponentProps } from 'react';

const ROOMY_SCREEN = '(min-width: 1024px) and (min-height: 900px)';

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(ROOMY_SCREEN);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getSnapshot() {
  return typeof window.matchMedia === 'function' && window.matchMedia(ROOMY_SCREEN).matches;
}

export function AdminOverviewCalendar(props: ComponentProps<typeof AdminCalendar>) {
  const roomy = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const [userOpen, setUserOpen] = useState<boolean | undefined>();
  const open = userOpen ?? roomy;
  return (
    <details
      className="group rounded-xl border border-border bg-surface p-3"
      open={open}
      onToggle={(event) => {
        if (event.currentTarget.open !== open) setUserOpen(event.currentTarget.open);
      }}
    >
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
        Lịch tháng <ChevronDown className="size-4 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <AdminCalendar {...props} />
    </details>
  );
}

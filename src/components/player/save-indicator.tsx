'use client';

import { Cloud, CloudOff, LoaderCircle } from 'lucide-react';
import type { SaveState } from './use-attempt';
import { cn } from '@/lib/utils';

export function SaveIndicator({ state, className }: { state: SaveState; className?: string }) {
  const map = {
    saved: { icon: Cloud, text: 'Saved', tone: 'text-muted-foreground' },
    pending: { icon: Cloud, text: 'Saving…', tone: 'text-muted-foreground' },
    saving: { icon: LoaderCircle, text: 'Saving…', tone: 'text-muted-foreground' },
    offline: { icon: CloudOff, text: 'Offline, retrying', tone: 'text-warning-foreground dark:text-warning' },
  } as const;
  const { icon: Icon, text, tone } = map[state];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', tone, className)} aria-live="polite">
      <Icon className={cn('size-3.5', state === 'saving' && 'animate-spin')} />
      {text}
    </span>
  );
}

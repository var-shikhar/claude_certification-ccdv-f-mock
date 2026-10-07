'use client';

import { useLinkStatus } from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Wrap a <Link>'s label in this when the target renders on the server: the label pulses
 * from the click until the next page arrives, so the control responds at once even
 * though its data needs a round trip.
 */
export function LinkPending({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return <span className={cn('transition-opacity', pending && 'animate-pulse opacity-70')}>{children}</span>;
}

'use client';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useStartAttempt } from '@/hooks/use-start-attempt';
import type { StartInput } from '@/server/attempts';

/** A button that starts an attempt with fixed settings (drill a domain, retry mistakes, …). */
export function StartButton({ input, children, ...props }: { input: StartInput; children: React.ReactNode } & Omit<React.ComponentProps<typeof Button>, 'onClick'>) {
  const start = useStartAttempt();
  return (
    <Button {...props} onClick={() => start.mutate(input)} disabled={start.isPending || props.disabled}>
      {start.isPending && <Spinner />}
      {children}
    </Button>
  );
}

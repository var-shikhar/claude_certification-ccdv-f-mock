'use client';

import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="grid min-h-[70dvh] place-items-center px-4">
      <div className="max-w-md text-center">
        <LogoMark className="mx-auto size-14" />
        <h1 className="mt-5 text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">Your answers are saved. Try again, and if it keeps happening, reload the page.</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Ref {error.digest}</p>}
        <Button variant="premium" className="mt-6" onClick={reset}><RotateCcw /> Try again</Button>
      </div>
    </div>
  );
}

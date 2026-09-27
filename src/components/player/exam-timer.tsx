'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function formatClock(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Counts down to the server's deadline, corrected for clock skew
 * (`offsetMs` = server time − device time when the attempt loaded).
 */
export function ExamTimer({ deadline, offsetMs, onExpire }: { deadline: string; offsetMs: number; onExpire: () => void }) {
  const end = new Date(deadline).getTime();
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  const warned = useRef({ ten: false, one: false });
  const expired = useRef(false);

  useEffect(() => {
    const tick = () => setNow(Date.now() + offsetMs);
    const t = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [offsetMs]);

  const remaining = end - now;

  useEffect(() => {
    if (remaining <= 10 * 60_000 && remaining > 9 * 60_000 && !warned.current.ten) {
      warned.current.ten = true;
      toast.warning('10 minutes left. Check your flagged questions.');
    }
    if (remaining <= 60_000 && remaining > 0 && !warned.current.one) {
      warned.current.one = true;
      toast.warning('1 minute left. Your answers will submit automatically.');
    }
    if (remaining <= 0 && !expired.current) {
      expired.current = true;
      onExpire();
    }
  }, [remaining, onExpire]);

  const level = remaining <= 2 * 60_000 ? 'danger' : remaining <= 10 * 60_000 ? 'warn' : 'ok';
  return (
    <span
      role="timer"
      aria-label={`Time remaining ${formatClock(remaining)}`}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-mono text-sm font-semibold tabular-nums transition-colors',
        level === 'ok' && 'bg-secondary',
        level === 'warn' && 'border-warning/60 bg-warning/15 text-warning-foreground dark:text-warning',
        level === 'danger' && 'animate-pulse border-destructive/50 bg-destructive/10 text-destructive',
      )}
    >
      <Clock className="size-3.5" />
      {formatClock(remaining)}
    </span>
  );
}

import { Check, Clock, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { id: 'A', text: 'Raise the temperature so the model explores more answers.' },
  { id: 'B', text: 'Send the batch through the Message Batches API overnight.', correct: true },
  { id: 'C', text: 'Stream each response and cancel slow ones.' },
  { id: 'D', text: 'Split every document into single-sentence requests.' },
];

const delay = (s: number) => ({ '--reveal-delay': `${s}s` }) as React.CSSProperties;

/**
 * A static, animated preview of the exam player for the landing page. CSS only
 * (float and staggered entrances), so it ships no JavaScript and the compositor
 * runs the float.
 */
export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-banana/30 via-primary/15 to-transparent blur-2xl" />
      <div className="animate-float overflow-hidden rounded-3xl border bg-card shadow-[0_40px_90px_-45px_oklch(0.38_0.06_45/0.6)]">
        <div className="flex items-center justify-between border-b px-5 py-3 text-xs">
          <span className="font-semibold text-muted-foreground">CCDV-F · Full mock</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 font-mono font-semibold tabular-nums">
            <Clock className="size-3.5 text-primary" /> 01:42:18
          </span>
        </div>
        <div className="h-1 bg-secondary"><div className="h-full w-[34%] bg-gradient-brand" /></div>
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Question 18 of 53</span>
            <span className="inline-flex items-center gap-1"><Flag className="size-3.5" /> Flag</span>
          </div>
          <p className="text-sm leading-relaxed font-medium">
            A team must summarise 10,000 support tickets by tomorrow morning at the lowest cost. Latency per ticket doesn&apos;t matter. Which approach fits best?
          </p>
          <div className="space-y-2">
            {OPTIONS.map((o, i) => (
              <div
                key={o.id}
                style={delay(0.4 + i * 0.08)}
                className={cn(
                  'reveal flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm',
                  o.correct ? 'border-primary/50 bg-primary/10' : 'text-muted-foreground',
                )}
              >
                <span className={o.correct
                  ? 'grid size-6 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground'
                  : 'grid size-6 shrink-0 place-items-center rounded-lg border text-xs font-semibold'}
                >
                  {o.correct ? <Check className="size-3.5" /> : o.id}
                </span>
                <span className={o.correct ? 'text-foreground' : ''}>{o.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={delay(1)} className="reveal absolute -bottom-5 -left-4 rounded-2xl border bg-card px-4 py-3 shadow-lg sm:-left-8">
        <div className="text-[0.7rem] text-muted-foreground">Predicted score</div>
        <div className="font-heading text-xl font-bold">
          784 <span className="text-xs font-medium text-success">Pass ✓</span>
        </div>
      </div>
    </div>
  );
}

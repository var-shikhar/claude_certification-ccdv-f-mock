'use client';

import { Flag } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { PlayerState } from '@/lib/dto';
import { usePlayerUi, type NavigatorFilter } from '@/stores/player-ui';
import { cn } from '@/lib/utils';

export function itemStatus(state: PlayerState, id: string) {
  const answered = (state.responses[id] ?? []).some((r) => r.trim().length > 0);
  const flagged = Boolean(state.flags[id]);
  const revealed = state.revealed[id];
  return { answered, flagged, verdict: revealed ? (revealed.correct ? 'right' : 'wrong') : null } as const;
}

/** Grid of question numbers showing answered / flagged / current (and right/wrong in drills). */
export function QuestionNavigator({ state, onJump }: { state: PlayerState; onJump: (index: number) => void }) {
  const filter = usePlayerUi((s) => s.filter);
  const setFilter = usePlayerUi((s) => s.setFilter);
  const counts = state.items.reduce(
    (acc, q) => {
      const s = itemStatus(state, q.id);
      if (s.answered) acc.answered += 1;
      if (s.flagged) acc.flagged += 1;
      return acc;
    },
    { answered: 0, flagged: 0 },
  );

  const visible = state.items
    .map((q, index) => ({ q, index, s: itemStatus(state, q.id) }))
    .filter(({ s }) => filter === 'all' || (filter === 'flagged' ? s.flagged : !s.answered));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="Answered" value={`${counts.answered}/${state.items.length}`} />
        <Stat label="Flagged" value={counts.flagged} />
        <Stat label="Left" value={state.items.length - counts.answered} />
      </div>

      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(v) => v && setFilter(v as NavigatorFilter)}
        variant="outline"
        size="sm"
        className="w-full"
      >
        <ToggleGroupItem value="all" className="flex-1">All</ToggleGroupItem>
        <ToggleGroupItem value="unanswered" className="flex-1">Unanswered</ToggleGroupItem>
        <ToggleGroupItem value="flagged" className="flex-1">Flagged</ToggleGroupItem>
      </ToggleGroup>

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {filter === 'flagged' ? 'No flagged questions.' : 'Everything is answered. 🎉'}
        </p>
      ) : (
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-7 lg:grid-cols-6">
          {visible.map(({ q, index, s }) => {
            const current = index === state.current;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onJump(index)}
                aria-label={`Question ${index + 1}${s.answered ? ', answered' : ''}${s.flagged ? ', flagged' : ''}`}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'relative grid aspect-square place-items-center rounded-lg border text-xs font-semibold tabular-nums transition-all hover:-translate-y-px',
                  s.answered && !s.verdict && 'border-primary/40 bg-primary/15 text-foreground',
                  s.verdict === 'right' && 'border-success/50 bg-success/15 text-success',
                  s.verdict === 'wrong' && 'border-destructive/50 bg-destructive/10 text-destructive',
                  !s.answered && 'text-muted-foreground',
                  current && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
              >
                {index + 1}
                {s.flagged && <Flag className="absolute -top-1 -right-1 size-3 fill-banana text-cocoa" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.7rem] text-muted-foreground">
        <Legend className="border-primary/40 bg-primary/15" label="Answered" />
        <Legend className="" label="Not answered" />
        <span className="inline-flex items-center gap-1"><Flag className="size-3 fill-banana text-cocoa" />Flagged</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border bg-secondary/40 px-2 py-2">
      <div className="font-heading text-base font-semibold tabular-nums">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('size-3 rounded border', className)} />
      {label}
    </span>
  );
}

'use client';

import { Award } from 'lucide-react';
import type { ExamConfig } from '@/lib/engine/types';
import { cn } from '@/lib/utils';

const LEVEL_COLORS = ['bg-success/70', 'bg-banana', 'bg-primary', 'bg-cocoa'];

/** Difficulty presets as selectable cards, each showing its item mix. */
export function DifficultyPicker({ exam, value, onChange, baseMinutes, showCertificate }: {
  exam: Pick<ExamConfig, 'difficultyModes' | 'difficultyLevels'>;
  value: string;
  onChange: (key: string) => void;
  baseMinutes?: number | null;
  showCertificate?: boolean;
}) {
  const levels = Object.keys(exam.difficultyLevels);
  return (
    <div role="radiogroup" aria-label="Difficulty" className="grid gap-2">
      {Object.entries(exam.difficultyModes).map(([key, mode]) => {
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(key)}
            className={cn(
              'rounded-2xl border p-3.5 text-left transition-all',
              selected ? 'border-primary bg-primary/[0.06] shadow-[0_0_0_1px_var(--primary)]' : 'hover:border-primary/30 hover:bg-accent/30',
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn('grid size-4 place-items-center rounded-full border', selected && 'border-primary')}>
                {selected && <span className="size-2 rounded-full bg-primary" />}
              </span>
              <span className="font-semibold">{mode.label}</span>
              {showCertificate && mode.certificate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[0.65rem] font-semibold text-success"><Award className="size-3" />Certificate</span>
              )}
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {baseMinutes ? `${Math.ceil(baseMinutes * mode.timeFactor)} min` : mode.timeFactor !== 1 ? `${Math.round(mode.timeFactor * 100)}% time` : ''}
              </span>
            </div>
            {selected && (
              <div className="mt-2 space-y-2 pl-6">
                <p className="text-xs text-muted-foreground">{mode.blurb}</p>
                <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary">
                  {levels.map((k, i) => (
                    <span key={k} className={LEVEL_COLORS[i]} style={{ width: `${Math.round((mode.mix[k as '1'] ?? 0) * 100)}%` }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.7rem] text-muted-foreground">
                  {levels.filter((k) => mode.mix[k as '1']).map((k) => (
                    <span key={k} className="inline-flex items-center gap-1">
                      <span className={cn('size-2 rounded-full', LEVEL_COLORS[Number(k) - 1])} />
                      {exam.difficultyLevels[k].label} {Math.round((mode.mix[k as '1'] ?? 0) * 100)}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

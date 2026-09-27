'use client';

import { useState } from 'react';
import type { SkillMastery } from '@/lib/readiness';

/**
 * Horizontal bars, one series in one color (mastery %), weakest first.
 * Bars are 10px (under the 24px cap) with a 4px rounded data-end and a square
 * baseline; the value sits at the tip in text ink, so nothing is hover-gated.
 */
export function MasteryBars({ skills, limit = 8 }: { skills: SkillMastery[]; limit?: number }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...skills].sort((a, b) => (a.answered ? a.mastery : 2) - (b.answered ? b.mastery : 2));
  const visible = showAll ? sorted : sorted.slice(0, limit);
  return (
    <div className="space-y-3">
      <ul className="space-y-3" aria-label="Mastery by skill, weakest first">
        {visible.map((s) => {
          const pct = s.answered ? Math.round(s.mastery * 100) : null;
          return (
            <li key={s.skillId} className="group grid grid-cols-[minmax(0,11rem)_1fr_3rem] items-center gap-3 text-sm" title={`${s.name}: ${pct == null ? 'not practised yet' : `${pct}% mastery from ${s.answered} answers`}`}>
              <span className="truncate text-muted-foreground group-hover:text-foreground">{s.name}</span>
              <span className="relative h-2.5 rounded-r-[4px] bg-secondary/70">
                {pct != null && (
                  <span
                    className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[width,filter] duration-700 group-hover:brightness-110"
                    style={{ width: `${Math.max(pct, 2)}%`, background: 'var(--chart-1)' }}
                  />
                )}
              </span>
              <span className="text-right text-xs font-semibold tabular-nums">{pct == null ? '—' : `${pct}%`}</span>
            </li>
          );
        })}
      </ul>
      {sorted.length > limit && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs font-medium text-primary hover:underline">
          {showAll ? 'Show fewer' : `Show all ${sorted.length} skills`}
        </button>
      )}
    </div>
  );
}

'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect } from 'react';

const R = 30;
const C = 2 * Math.PI * R;

/** Today's goal: questions answered vs. the daily target. */
export function GoalRing({ done, goal }: { done: number; goal: number }) {
  const reduce = useReducedMotion();
  const pct = Math.min(1, goal ? done / goal : 0);
  const v = useMotionValue(reduce ? pct : 0);
  const offset = useTransform(v, (x) => C * (1 - x));
  useEffect(() => {
    if (reduce) return;
    const a = animate(v, pct, { duration: 1, ease: [0.22, 1, 0.36, 1] });
    return () => a.stop();
  }, [pct, v, reduce]);
  const complete = done >= goal;
  return (
    <div className="relative size-20 shrink-0">
      <svg viewBox="0 0 72 72" className="size-full -rotate-90">
        <circle cx="36" cy="36" r={R} fill="none" className="stroke-secondary" strokeWidth="7" />
        <motion.circle cx="36" cy="36" r={R} fill="none" strokeWidth="7" strokeLinecap="round" strokeDasharray={C} style={{ strokeDashoffset: offset }} className={complete ? 'stroke-success' : 'stroke-primary'} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div>
          <div className="font-heading text-lg font-bold tabular-nums">{Math.min(done, 999)}</div>
          <div className="text-[0.6rem] text-muted-foreground">of {goal}</div>
        </div>
      </div>
    </div>
  );
}

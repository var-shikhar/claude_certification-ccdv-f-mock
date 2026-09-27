'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

const R = 52;
const C = 2 * Math.PI * R;

/**
 * Animated ring. `value` and `mark` are fractions (0..1); `label` is what the
 * number in the middle counts up to.
 */
export function ScoreRing({ value, mark, label, sublabel, tone, size = 176 }: {
  value: number;
  mark?: number;
  label: number;
  sublabel?: string;
  tone: 'pass' | 'fail' | 'neutral';
  size?: number;
}) {
  const reduce = useReducedMotion();
  const progress = useMotionValue(reduce ? value : 0);
  const count = useMotionValue(reduce ? label : 0);
  const shown = useTransform(count, (v) => Math.round(v).toLocaleString());
  const dash = useTransform(progress, (v) => C * (1 - v));

  useEffect(() => {
    if (reduce) return;
    const a = animate(progress, value, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    const b = animate(count, label, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    return () => { a.stop(); b.stop(); };
  }, [value, label, progress, count, reduce]);

  const markAngle = mark != null ? mark * 360 - 90 : null;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" className="stroke-secondary" strokeWidth="10" />
        <motion.circle
          cx="60" cy="60" r={R} fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={C}
          style={{ strokeDashoffset: dash }}
          className={cn(tone === 'pass' && 'stroke-success', tone === 'fail' && 'stroke-primary', tone === 'neutral' && 'stroke-primary')}
        />
      </svg>
      {markAngle != null && (
        <span
          aria-hidden
          className="absolute top-1/2 left-1/2 h-[14px] w-[3px] rounded-full bg-foreground/70"
          style={{ transform: `translate(-50%, -50%) rotate(${markAngle + 90}deg) translateY(-${size * 0.433}px)` }}
        />
      )}
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <motion.div className="font-heading text-4xl font-bold tabular-nums">{shown}</motion.div>
          {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}

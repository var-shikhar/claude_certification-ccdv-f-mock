'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect } from 'react';

const R = 70;
const ARC = Math.PI * R;

/** Semicircle gauge for readiness (0–100); null shows an empty gauge. */
export function ReadinessGauge({ value }: { value: number | null }) {
  const reduce = useReducedMotion();
  const v = useMotionValue(reduce ? (value ?? 0) : 0);
  const offset = useTransform(v, (x) => ARC * (1 - x / 100));
  const text = useTransform(v, (x) => `${Math.round(x)}`);
  useEffect(() => {
    if (reduce || value == null) return;
    const a = animate(v, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return () => a.stop();
  }, [value, v, reduce]);

  return (
    <div className="relative mx-auto w-48">
      <svg viewBox="0 0 160 90" className="w-full">
        <defs>
          <linearGradient id="gauge-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--banana)" />
            <stop offset="1" stopColor="var(--primary)" />
          </linearGradient>
        </defs>
        <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" className="stroke-secondary" strokeWidth="12" strokeLinecap="round" />
        {value != null && (
          <motion.path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke="url(#gauge-grad)" strokeWidth="12" strokeLinecap="round" strokeDasharray={ARC} style={{ strokeDashoffset: offset }} />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        {value == null ? (
          <div className="font-heading text-2xl font-bold text-muted-foreground">—</div>
        ) : (
          <div className="font-heading text-4xl font-bold tabular-nums"><motion.span>{text}</motion.span><span className="text-xl">%</span></div>
        )}
        <div className="text-xs text-muted-foreground">readiness</div>
      </div>
    </div>
  );
}

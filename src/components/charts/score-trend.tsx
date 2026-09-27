'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface TrendPoint { id: string; at: string; value: number; label: string }

const HEIGHT = 220;
const PAD = { top: 16, right: 56, bottom: 28, left: 40 };

/**
 * Single-series line chart of scaled mock scores with a pass-mark reference.
 * Specs: 2px line, r=4 markers with a 2px surface ring, hairline solid grid,
 * crosshair that snaps to the nearest attempt (pointer and keyboard), value
 * direct-labelled at the latest point, and a table view for every value.
 */
export function ScoreTrend({ points, min, max, passing, title }: { points: TrendPoint[]; min: number; max: number; passing: number; title: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;
  const ticks = useMemo(() => {
    const step = (max - min) / 3;
    return [0, 1, 2, 3].map((k) => Math.round(min + k * step));
  }, [min, max]);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = points.length > 1 ? `${path} L${x(points.length - 1)},${y(min)} L${x(0)},${y(min)} Z` : '';
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  function onPointer(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setActive(best);
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') { e.preventDefault(); setActive((a) => Math.min(points.length - 1, (a ?? -1) + 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setActive((a) => Math.max(0, (a ?? points.length) - 1)); }
    if (e.key === 'Escape') setActive(null);
  }

  const last = points.length - 1;
  const tip = active != null ? points[active] : null;

  return (
    <figure className="space-y-3">
      <div
        ref={wrap}
        className="relative outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={0}
        role="img"
        aria-label={`${title}. ${points.length} attempts, latest ${points[last]?.value ?? 'none'}, pass mark ${passing}. Use arrow keys to step through attempts.`}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={HEIGHT} onPointerMove={onPointer} onPointerLeave={() => setActive(null)} className="block touch-pan-y">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">{t.toLocaleString()}</text>
            </g>
          ))}
          {/* pass mark: a solid reference rule, labelled in text so it never relies on color */}
          <line x1={PAD.left} x2={width - PAD.right} y1={y(passing)} y2={y(passing)} stroke="var(--muted-foreground)" strokeWidth={1} opacity={0.7} />
          <text x={width - PAD.right + 6} y={y(passing)} dy="0.32em" className="fill-muted-foreground text-[10px] font-medium">Pass {passing}</text>

          {area && <path d={area} fill="var(--chart-1)" opacity={0.1} />}
          <path d={path} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {active != null && (
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--muted-foreground)" strokeWidth={1} opacity={0.6} />
          )}
          {points.map((p, i) => (
            <circle key={p.id} cx={x(i)} cy={y(p.value)} r={active === i ? 5.5 : 4} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2} />
          ))}
          {points.length > 0 && (
            <text x={x(last) + 8} y={y(points[last].value)} dy="-0.6em" className="fill-foreground text-[11px] font-semibold tabular-nums">{points[last].value}</text>
          )}

          {points.length > 0 && (
            <>
              <text x={x(0)} y={HEIGHT - 8} textAnchor={points.length === 1 ? 'middle' : 'start'} className="fill-muted-foreground text-[10px]">{fmtDate(points[0].at)}</text>
              {points.length > 1 && <text x={x(last)} y={HEIGHT - 8} textAnchor="end" className="fill-muted-foreground text-[10px]">{fmtDate(points[last].at)}</text>}
            </>
          )}
        </svg>

        {tip && active != null && (
          <div
            className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg"
            style={{ left: Math.min(Math.max(x(active), 80), width - 80), top: Math.max(0, y(tip.value) - 72) }}
          >
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-3 rounded-full" style={{ background: 'var(--chart-1)' }} />
              <span className="font-heading text-base font-semibold text-foreground">{tip.value}</span>
              <span className={tip.value >= passing ? 'text-success' : 'text-muted-foreground'}>{tip.value >= passing ? '✓ pass' : 'below pass'}</span>
            </div>
            <div className="mt-0.5 text-muted-foreground">{tip.label} · {fmtDate(tip.at)}</div>
          </div>
        )}
      </div>

      <details className="group text-sm">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">View as table</summary>
        <div className="mt-2 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/60 text-muted-foreground">
              <tr><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Attempt</th><th className="px-3 py-2 text-right font-medium">Score</th><th className="px-3 py-2 font-medium">Result</th></tr>
            </thead>
            <tbody className="divide-y">
              {points.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">{new Date(p.at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                  <td className="px-3 py-2">{p.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.value}</td>
                  <td className="px-3 py-2">{p.value >= passing ? 'Pass' : 'Below pass'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

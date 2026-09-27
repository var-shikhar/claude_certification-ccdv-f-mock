import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { dayKey } from '@/lib/streak';

/** Twelve weeks of practice, one square per day (GitHub style), in the learner's time zone. */
export function ActivityHeatmap({ days, timeZone, weeks = 12 }: { days: { day: string; items: number }[]; timeZone: string; weeks?: number }) {
  const byDay = new Map(days.map((d) => [d.day, d.items]));
  const today = new Date();
  const todayKey = dayKey(today, timeZone);
  // Start on the Monday `weeks` weeks ago so columns are whole weeks.
  const start = new Date(`${todayKey}T00:00:00Z`);
  const weekday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - weekday - (weeks - 1) * 7);

  const columns: { key: string; items: number; future: boolean }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const t = new Date(start);
      t.setUTCDate(start.getUTCDate() + w * 7 + d);
      const key = t.toISOString().slice(0, 10);
      col.push({ key, items: byDay.get(key) ?? 0, future: key > todayKey });
    }
    columns.push(col);
  }
  const max = Math.max(10, ...days.map((d) => d.items));
  const shade = (n: number) => (n === 0 ? 0 : n < max * 0.25 ? 25 : n < max * 0.5 ? 45 : n < max * 0.75 ? 70 : 95);
  const activeDays = days.filter((d) => d.items > 0).length;

  return (
    <div className="space-y-2">
      <div className="flex gap-[3px]">
        {columns.map((col, i) => (
          <div key={i} className="flex flex-1 flex-col gap-[3px]">
            {col.map((c) => (
              c.future ? <span key={c.key} className="aspect-square rounded-[3px]" /> : (
                <Tooltip key={c.key}>
                  <TooltipTrigger asChild>
                    <span
                      className="aspect-square rounded-[3px] border border-border/40"
                      style={{ background: c.items ? `color-mix(in oklch, var(--primary) ${shade(c.items)}%, var(--secondary))` : 'var(--secondary)' }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {c.items ? `${c.items} question${c.items === 1 ? '' : 's'}` : 'No practice'} · {new Date(`${c.key}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </TooltipContent>
                </Tooltip>
              )
            ))}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{activeDays} active day{activeDays === 1 ? '' : 's'} in the last {weeks} weeks</p>
    </div>
  );
}

// Day keys and streak arithmetic (pure, shared by server code and tests).

/** YYYY-MM-DD for `at` in the given IANA time zone. */
export function dayKey(at: Date, timeZone = 'UTC'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

export function previousDay(day: string): string {
  const t = new Date(`${day}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() - 1);
  return t.toISOString().slice(0, 10);
}

/** Consecutive active days ending today, or yesterday so a streak survives until midnight. */
export function computeStreak(days: string[], today: string): { current: number; best: number; activeToday: boolean } {
  const set = new Set(days);
  const activeToday = set.has(today);
  let cursor = activeToday ? today : previousDay(today);
  let current = 0;
  while (set.has(cursor)) { current += 1; cursor = previousDay(cursor); }

  let best = 0;
  let run = 0;
  let last: string | null = null;
  for (const d of [...set].sort()) {
    run = last && previousDay(d) === last ? run + 1 : 1;
    best = Math.max(best, run);
    last = d;
  }
  return { current, best: Math.max(best, current), activeToday };
}

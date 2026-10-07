import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { cached } from '../cache';

/**
 * Classical item analysis for one exam.
 *
 * - p (difficulty index): share of answers that were correct, across every
 *   answered attempt item (drills and mocks).
 * - discrimination: p among the top quarter of scored attempts minus p among
 *   the bottom quarter (upper–lower index). Good items sit well above 0.2;
 *   a negative value usually means the key is wrong or the stem misleads.
 * - distractors: how often each option was selected, for choice items.
 */
export interface ItemStat {
  questionId: string;
  n: number;
  p: number | null;
  nScored: number;
  discrimination: number | null;
  avgTimeMs: number | null;
  picks: Record<string, number>;
  flags: ItemFlag[];
}

import type { ItemFlag } from '@/lib/item-flags';

export { FLAG_INFO, type ItemFlag } from '@/lib/item-flags';

const MIN_N = 20;
const MIN_SCORED = 12;
const SNAPSHOT_TTL = 60_000;

export async function getItemStats(examId: string, questionIds?: string[], opts: { picks?: boolean } = {}): Promise<Record<string, ItemStat>> {
  const only = questionIds?.length ? sql`and ai.question_id in (${sql.join(questionIds.map((id) => sql`${id}`), sql`, `)})` : sql``;

  // Independent aggregates, so they share one round trip.
  const [base, disc, picks] = await Promise.all([
    db.execute<{ question_id: string; n: number; p: number | null; avg_time: number | null }>(sql`
      select ai.question_id, count(*)::int as n, avg(ai.correct::int)::float as p, avg(nullif(ai.time_ms, 0))::float as avg_time
      from attempt_item ai
      where ai.exam_id = ${examId} and ai.answered ${only}
      group by ai.question_id`),

    db.execute<{ question_id: string; n_scored: number; p_hi: number | null; p_lo: number | null }>(sql`
      with scored as (
        select id, (summary->>'rawWeighted')::float as s
        from attempt
        where exam_id = ${examId} and status = 'submitted' and kind in ('full', 'quick', 'diagnostic') and summary is not null
      ), ranked as (
        select id, ntile(4) over (order by s) as quartile from scored
      )
      select ai.question_id, count(*)::int as n_scored,
        avg(ai.correct::int) filter (where r.quartile = 4)::float as p_hi,
        avg(ai.correct::int) filter (where r.quartile = 1)::float as p_lo
      from attempt_item ai
      join ranked r on r.id = ai.attempt_id
      where ai.exam_id = ${examId} ${only}
      group by ai.question_id`),

    opts.picks === false ? null : db.execute<{ question_id: string; opt: string; n: number }>(sql`
      select ai.question_id, opt, count(*)::int as n
      from attempt_item ai, jsonb_array_elements_text(ai.selected) as opt
      where ai.exam_id = ${examId} and ai.answered and opt !~ '='
      ${only}
      group by ai.question_id, opt`),
  ]);

  const out: Record<string, ItemStat> = {};
  for (const r of base.rows) {
    out[r.question_id] = { questionId: r.question_id, n: r.n, p: r.p, nScored: 0, discrimination: null, avgTimeMs: r.avg_time, picks: {}, flags: [] };
  }
  for (const r of disc.rows) {
    const s = out[r.question_id];
    if (!s) continue;
    s.nScored = r.n_scored;
    s.discrimination = r.p_hi != null && r.p_lo != null && r.n_scored >= MIN_SCORED ? r.p_hi - r.p_lo : null;
  }
  for (const r of picks?.rows ?? []) {
    const s = out[r.question_id];
    if (s) s.picks[r.opt] = r.n;
  }
  for (const s of Object.values(out)) s.flags = flagsFor(s);
  return out;
}

/**
 * Statistics for every item in an exam, for the question list and the admin
 * overview. Aggregating every answer on each request would grow with learner
 * activity, so the result is shared for a minute. Option picks are left out:
 * only the editor's dead-distractor check reads them. Treat it as read-only.
 */
export const getItemStatsSnapshot = (examId: string) =>
  cached(`admin:item-stats:${examId}`, () => getItemStats(examId, undefined, { picks: false }), SNAPSHOT_TTL);

export function flagsFor(s: Pick<ItemStat, 'n' | 'p' | 'discrimination' | 'picks'>, optionIds?: string[]): ItemFlag[] {
  const flags: ItemFlag[] = [];
  if (s.n < MIN_N || s.p == null) return flags;
  if (s.p > 0.95) flags.push('too-easy');
  if (s.p < 0.2) flags.push('too-hard');
  if (s.discrimination != null) {
    if (s.discrimination < 0) flags.push('negative-discrimination');
    else if (s.discrimination < 0.15) flags.push('weak-discrimination');
  }
  if (optionIds?.length) {
    const total = Object.values(s.picks).reduce((a, b) => a + b, 0);
    if (total >= MIN_N && optionIds.some((id) => (s.picks[id] ?? 0) / total < 0.03)) flags.push('dead-distractor');
  }
  return flags;
}

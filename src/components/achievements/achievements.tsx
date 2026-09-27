import Link from 'next/link';
import { Lock, Trophy } from 'lucide-react';
import type { BadgeDef } from '@/lib/badges';
import { cn } from '@/lib/utils';
import type { LeaderRow } from '@/server/gamification';

export function BadgeGrid({ badges }: { badges: (BadgeDef & { earnedAt: string | null })[] }) {
  const earned = badges.filter((b) => b.earnedAt).length;
  return (
    <section className="space-y-4 rounded-3xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Badges</h2>
        <span className="text-sm text-muted-foreground">{earned} of {badges.length}</span>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {badges.map((b) => (
          <li
            key={b.id}
            className={cn('flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-center transition-colors', b.earnedAt ? 'border-primary/30 bg-primary/[0.05]' : 'opacity-60')}
            title={b.earnedAt ? `Earned ${new Date(b.earnedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}` : 'Not earned yet'}
          >
            <span className={cn('grid size-12 place-items-center rounded-full text-2xl', b.earnedAt ? 'bg-gradient-to-br from-banana/60 to-primary/40' : 'bg-secondary grayscale')} aria-hidden>
              {b.earnedAt ? b.emoji : <Lock className="size-5 text-muted-foreground" />}
            </span>
            <span className="text-sm font-semibold">{b.name}</span>
            <span className="text-xs text-muted-foreground">{b.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Leaderboard({ top, me, optedIn, anonymous }: { top: LeaderRow[]; me: LeaderRow | null; optedIn: boolean; anonymous: boolean }) {
  return (
    <section className="space-y-4 rounded-3xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold"><Trophy className="size-4 text-primary" /> This week&apos;s leaderboard</h2>
        <span className="text-xs text-muted-foreground">XP, last 7 days</span>
      </div>
      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one has earned XP this week yet. Be the first!</p>
      ) : (
        <ol className="space-y-1">
          {top.map((r) => (
            <li key={r.userId} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm', r.me && 'bg-primary/10 font-semibold')}>
              <span className={cn('w-6 text-center font-heading font-bold tabular-nums', r.rank <= 3 && 'text-primary')}>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span>
              <span className="flex-1 truncate">{r.name}{r.me ? ' (you)' : ''}</span>
              <span className="tabular-nums">{r.xp.toLocaleString()} XP</span>
            </li>
          ))}
        </ol>
      )}
      {me && me.rank > top.length && <p className="text-sm">You&apos;re <b>#{me.rank}</b> with {me.xp.toLocaleString()} XP this week.</p>}
      {anonymous ? (
        <p className="text-xs text-muted-foreground"><Link href="/sign-up" className="text-primary hover:underline">Create an account</Link> to appear on the leaderboard.</p>
      ) : !optedIn ? (
        <p className="text-xs text-muted-foreground">You&apos;re hidden from leaderboards. <Link href="/settings" className="text-primary hover:underline">Change this in settings</Link>.</p>
      ) : null}
    </section>
  );
}

export function NewBadges({ badges }: { badges: BadgeDef[] }) {
  if (!badges.length) return null;
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-3xl border border-banana/60 bg-banana/15 p-4">
      <span className="text-sm font-semibold">New badge{badges.length > 1 ? 's' : ''} unlocked!</span>
      {badges.map((b) => (
        <span key={b.id} className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-sm font-medium shadow-sm animate-pop">
          <span aria-hidden>{b.emoji}</span>{b.name}
        </span>
      ))}
      <Link href="/progress?tab=achievements" className="ml-auto text-sm font-medium text-primary hover:underline">See all</Link>
    </section>
  );
}

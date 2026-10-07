import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { UpgradeButton } from '@/components/billing/billing-buttons';
import { Reveal } from '@/components/common/reveal';
import { Button } from '@/components/ui/button';
import { billingEnabled, getPlan, getProPrice } from '@/server/billing';
import { getUser } from '@/server/session';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Practise free. Upgrade for unlimited full mocks and more AI coaching.',
  alternates: { canonical: '/pricing' },
};

const FREE = [
  'Every exam and quiz in the catalog',
  'Diagnostics, drills, quick mocks and adaptive tests',
  'Explanations for every option',
  'Readiness score, study plan and spaced review',
  'Verifiable readiness certificates',
];
const PRO = [
  'Everything in Free',
  'Unlimited full-length mock exams',
  'More AI tutor, interview and coaching requests every day',
  'Priority access to new exams',
];

export default async function PricingPage() {
  const [user, price] = await Promise.all([getUser(), getProPrice()]);
  const enabled = billingEnabled();
  const plan = user ? await getPlan(user.id) : 'free';
  const fmt = price ? new Intl.NumberFormat(undefined, { style: 'currency', currency: price.currency, maximumFractionDigits: price.amount % 1 ? 2 : 0 }).format(price.amount) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6">
      <Reveal className="mx-auto max-w-2xl space-y-3 text-center">
        <h1 className="text-4xl font-bold">Simple pricing</h1>
        <p className="text-lg text-muted-foreground">Everything you need to prepare is free. Pro is for people who want to sit mock after mock.</p>
      </Reveal>

      <div className="grid gap-5 md:grid-cols-2">
        <Reveal className="flex flex-col rounded-3xl border bg-card p-7">
          <h2 className="text-lg font-semibold">Free</h2>
          <p className="mt-1 font-heading text-4xl font-bold">{price ? new Intl.NumberFormat(undefined, { style: 'currency', currency: price.currency, maximumFractionDigits: 0 }).format(0) : 'Free'}</p>
          <p className="text-sm text-muted-foreground">forever</p>
          <ul className="mt-6 flex-1 space-y-2.5 text-sm">{FREE.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{f}</li>)}</ul>
          {enabled && <p className="mt-4 text-xs text-muted-foreground">Includes {process.env.FREE_FULL_MOCKS_PER_MONTH || 2} full mocks per exam every 30 days.</p>}
          <div className="mt-6">
            {user ? <Button asChild variant="outline" size="xl" className="w-full"><Link href="/dashboard">{plan === 'free' ? 'Your current plan' : 'Go to dashboard'}</Link></Button>
              : <Button asChild variant="outline" size="xl" className="w-full"><Link href="/sign-up">Start free</Link></Button>}
          </div>
        </Reveal>

        <Reveal delay={0.08} className="relative flex flex-col overflow-hidden rounded-3xl border border-primary/40 bg-card p-7 shadow-glow">
          <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 size-56 rounded-full bg-banana/30 blur-3xl dark:bg-primary/15" />
          <h2 className="relative flex items-center gap-2 text-lg font-semibold"><Sparkles className="size-4 text-primary" /> Pro</h2>
          {fmt ? (
            <>
              <p className="relative mt-1 font-heading text-4xl font-bold">{fmt}</p>
              <p className="relative text-sm text-muted-foreground">per {price!.interval}, cancel any time</p>
            </>
          ) : (
            <>
              <p className="relative mt-1 font-heading text-4xl font-bold">Coming soon</p>
              <p className="relative text-sm text-muted-foreground">Everything is unlocked while we get ready.</p>
            </>
          )}
          <ul className="relative mt-6 flex-1 space-y-2.5 text-sm">{PRO.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{f}</li>)}</ul>
          <div className="relative mt-6">
            {!enabled || !price ? (
              <Button variant="premium" size="xl" className="w-full" disabled>Available soon</Button>
            ) : plan === 'pro' ? (
              <Button asChild variant="outline" size="xl" className="w-full"><Link href="/settings">You&apos;re on Pro · manage</Link></Button>
            ) : user && !user.isAnonymous ? (
              <UpgradeButton className="w-full" />
            ) : (
              <Button asChild variant="premium" size="xl" className="w-full"><Link href="/sign-up?next=/pricing">Create an account to upgrade</Link></Button>
            )}
          </div>
        </Reveal>
      </div>

      <p className="text-center text-sm text-muted-foreground">Teaching a class or training a team? <Link href="/teams" className="text-primary hover:underline">Teams</Link> are included on every plan.</p>
    </div>
  );
}

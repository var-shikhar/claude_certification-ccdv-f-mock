import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, count, eq, gte } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/db';
import { attempt, profile, subscription, user } from '@/db/schema';
import { AppError } from './errors';

// Stripe over plain HTTPS (no SDK needed). Everything here is inert until
// STRIPE_SECRET_KEY and STRIPE_PRICE_ID are set: without them every learner
// gets the full product and no limits apply.

export const billingEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
const FREE_FULL_MOCKS_PER_MONTH = () => Number(process.env.FREE_FULL_MOCKS_PER_MONTH || 2);

async function stripe<T>(path: string, params?: Record<string, string>, method: 'GET' | 'POST' = 'POST'): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: method === 'POST' && params ? new URLSearchParams(params).toString() : undefined,
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[stripe]', data?.error?.message);
    throw new AppError('Payments are unavailable right now. Please try again later.', 502, 'BILLING');
  }
  return data as T;
}

export interface ProPrice { amount: number; currency: string; interval: string }

/** The Pro price as configured in Stripe (so the page never shows a made-up number). */
export const getProPrice = cache(async (): Promise<ProPrice | null> => {
  if (!billingEnabled()) return null;
  try {
    const p = await stripe<{ unit_amount: number; currency: string; recurring?: { interval: string } }>(`prices/${process.env.STRIPE_PRICE_ID}`, undefined, 'GET');
    return { amount: p.unit_amount / 100, currency: p.currency.toUpperCase(), interval: p.recurring?.interval ?? 'month' };
  } catch {
    return null;
  }
});

export async function getPlan(userId: string): Promise<'free' | 'pro'> {
  const [row] = await db.select({ plan: profile.plan }).from(profile).where(eq(profile.userId, userId)).limit(1);
  return row?.plan ?? 'free';
}

/** Free-plan limit on full mocks; a no-op while billing is off. */
export async function assertCanStartFullMock(userId: string, examId: string) {
  if (!billingEnabled() || (await getPlan(userId)) === 'pro') return;
  const [row] = await db.select({ n: count() }).from(attempt).where(and(
    eq(attempt.userId, userId), eq(attempt.examId, examId), eq(attempt.kind, 'full'),
    gte(attempt.startedAt, new Date(Date.now() - 30 * 86_400_000)),
  ));
  if ((row?.n ?? 0) >= FREE_FULL_MOCKS_PER_MONTH()) {
    throw new AppError(`The free plan includes ${FREE_FULL_MOCKS_PER_MONTH()} full mocks per exam every 30 days. Upgrade to Pro for unlimited mocks, or keep practising with drills and quick mocks.`, 402, 'UPGRADE');
  }
}

export async function createCheckout(userId: string, origin: string) {
  if (!billingEnabled()) throw new AppError('Upgrades are not available yet.', 503, 'BILLING_OFF');
  const [u] = await db.select({ email: user.email, isAnonymous: user.isAnonymous }).from(user).where(eq(user.id, userId)).limit(1);
  if (!u || u.isAnonymous) throw new AppError('Create a free account before upgrading.', 400, 'ACCOUNT_REQUIRED');
  const [sub] = await db.select().from(subscription).where(eq(subscription.userId, userId)).limit(1);
  const params: Record<string, string> = {
    mode: 'subscription',
    'line_items[0][price]': process.env.STRIPE_PRICE_ID!,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/settings?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    client_reference_id: userId,
    'subscription_data[metadata][userId]': userId,
    allow_promotion_codes: 'true',
  };
  if (sub?.stripeCustomerId) params.customer = sub.stripeCustomerId;
  else params.customer_email = u.email;
  const session = await stripe<{ url: string }>('checkout/sessions', params);
  return { url: session.url };
}

export async function createPortal(userId: string, origin: string) {
  if (!billingEnabled()) throw new AppError('Billing is not available yet.', 503, 'BILLING_OFF');
  const [sub] = await db.select().from(subscription).where(eq(subscription.userId, userId)).limit(1);
  if (!sub?.stripeCustomerId) throw new AppError('No subscription to manage yet.', 400);
  const session = await stripe<{ url: string }>('billing_portal/sessions', { customer: sub.stripeCustomerId, return_url: `${origin}/settings` });
  return { url: session.url };
}

/** Verifies a Stripe webhook signature (v1 scheme, 5-minute tolerance). */
export function verifyStripeSignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  return header.split(',').filter((p) => p.startsWith('v1=')).some((p) => {
    const sig = p.slice(3);
    return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  });
}

const ACTIVE = new Set(['active', 'trialing', 'past_due']);

async function setPlan(userId: string, status: string, customerId: string | null, subscriptionId: string | null, periodEnd: number | null) {
  const plan = ACTIVE.has(status) ? 'pro' : 'free';
  await db.insert(subscription).values({
    userId, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
  }).onConflictDoUpdate({
    target: subscription.userId,
    set: { stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, status, currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null },
  });
  await db.insert(profile).values({ userId, plan }).onConflictDoUpdate({ target: profile.userId, set: { plan } });
}

export async function handleStripeEvent(event: { type: string; data: { object: Record<string, unknown> } }) {
  const obj = event.data.object;
  if (event.type === 'checkout.session.completed') {
    const userId = obj.client_reference_id as string | undefined;
    if (userId) await setPlan(userId, 'active', (obj.customer as string) ?? null, (obj.subscription as string) ?? null, null);
    return;
  }
  if (event.type.startsWith('customer.subscription.')) {
    const customer = obj.customer as string;
    const metaUser = (obj.metadata as Record<string, string> | undefined)?.userId;
    const [existing] = await db.select({ userId: subscription.userId }).from(subscription).where(eq(subscription.stripeCustomerId, customer)).limit(1);
    const userId = existing?.userId ?? metaUser;
    if (!userId) return;
    const status = event.type === 'customer.subscription.deleted' ? 'canceled' : String(obj.status);
    await setPlan(userId, status, customer, obj.id as string, (obj.current_period_end as number | undefined) ?? null);
  }
}

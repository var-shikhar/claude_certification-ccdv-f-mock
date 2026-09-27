import { NextResponse } from 'next/server';
import { handleStripeEvent, verifyStripeSignature } from '@/server/billing';

/** Stripe webhook: plan changes arrive here. Configure it in the Stripe dashboard. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhooks are not configured.' }, { status: 503 });
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }
  try {
    await handleStripeEvent(JSON.parse(payload));
  } catch (err) {
    console.error('[stripe webhook]', err);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

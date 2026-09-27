import { createHmac } from 'node:crypto';
import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/db', () => ({ db: {} }));

const { verifyStripeSignature } = await import('@/server/billing');

const secret = 'whsec_test_secret';
const sign = (payload: string, t: number, key = secret) => `t=${t},v1=${createHmac('sha256', key).update(`${t}.${payload}`).digest('hex')}`;

describe('stripe webhook signatures', () => {
  const payload = JSON.stringify({ type: 'checkout.session.completed' });
  const now = Math.floor(Date.now() / 1000);

  test('accepts a fresh, correctly signed payload', () => {
    expect(verifyStripeSignature(payload, sign(payload, now), secret)).toBe(true);
  });
  test('rejects a tampered payload', () => {
    expect(verifyStripeSignature(payload + ' ', sign(payload, now), secret)).toBe(false);
  });
  test('rejects the wrong secret', () => {
    expect(verifyStripeSignature(payload, sign(payload, now, 'whsec_other'), secret)).toBe(false);
  });
  test('rejects stale timestamps and missing headers', () => {
    expect(verifyStripeSignature(payload, sign(payload, now - 3600), secret)).toBe(false);
    expect(verifyStripeSignature(payload, null, secret)).toBe(false);
  });
});

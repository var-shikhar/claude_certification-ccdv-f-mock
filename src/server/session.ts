import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth, type SessionUser } from '@/lib/auth';
import type { Role } from '@/db/schema';

/** The current session, deduplicated per request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export async function getUser(): Promise<SessionUser | null> {
  return (await getSession())?.user ?? null;
}

/** Signed-in user (guests included) or a redirect to sign-in. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(next ? `/sign-in?next=${encodeURIComponent(next)}` : '/sign-in');
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) redirect('/dashboard');
  return user;
}

export const isStaff = (user: Pick<SessionUser, 'role'> | null | undefined) => user?.role === 'admin' || user?.role === 'author';

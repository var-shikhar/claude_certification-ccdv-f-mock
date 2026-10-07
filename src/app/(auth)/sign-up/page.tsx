import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/auth-form';
import { enabledSocialProviders } from '@/lib/auth';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { getUser } from '@/server/session';

export const metadata: Metadata = { title: 'Create your account' };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getUser();
  if (user && !user.isAnonymous) redirect(safeRedirectPath(next, '/dashboard'));
  return <AuthForm mode="sign-up" next={next} providers={enabledSocialProviders} isGuest={Boolean(user?.isAnonymous)} />;
}

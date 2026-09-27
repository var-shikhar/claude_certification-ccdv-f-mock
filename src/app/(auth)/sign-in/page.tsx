import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/auth-form';
import { enabledSocialProviders } from '@/lib/auth';
import { getUser } from '@/server/session';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getUser();
  if (user && !user.isAnonymous) redirect(next?.startsWith('/') ? next : '/dashboard');
  return <AuthForm mode="sign-in" next={next} providers={enabledSocialProviders} isGuest={Boolean(user?.isAnonymous)} />;
}

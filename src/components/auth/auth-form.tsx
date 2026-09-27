'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Eye, EyeOff, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { authClient, signIn, signUp } from '@/lib/auth-client';

type Mode = 'sign-in' | 'sign-up';

const COPY: Record<Mode, { title: string; subtitle: string; cta: string; switchText: string; switchLink: string; switchHref: string }> = {
  'sign-in': {
    title: 'Welcome back',
    subtitle: 'Pick up right where you left off.',
    cta: 'Sign in',
    switchText: "New to certMonkey?",
    switchLink: 'Create an account',
    switchHref: '/sign-up',
  },
  'sign-up': {
    title: 'Create your free account',
    subtitle: 'Save your progress, streaks and certificates across devices.',
    cta: 'Create account',
    switchText: 'Already have an account?',
    switchLink: 'Sign in',
    switchHref: '/sign-in',
  },
};

export function AuthForm({ mode, next, providers, isGuest }: { mode: Mode; next?: string; providers: ('google' | 'github')[]; isGuest?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[mode];
  const destination = next && next.startsWith('/') ? next : '/dashboard';

  function done() {
    router.push(destination);
    router.refresh();
  }

  function onSubmit(form: FormData) {
    setError(null);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const name = String(form.get('name') ?? '').trim();
    startTransition(async () => {
      const res = mode === 'sign-up'
        ? await signUp.email({ email, password, name: name || email.split('@')[0] })
        : await signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? 'Something went wrong. Please try again.');
        return;
      }
      toast.success(mode === 'sign-up' ? (isGuest ? 'Account created. Your guest progress came with you.' : 'Welcome to certMonkey!') : 'Signed in');
      done();
    });
  }

  function social(provider: 'google' | 'github') {
    startTransition(async () => {
      await signIn.social({ provider, callbackURL: destination });
    });
  }

  function guest() {
    startTransition(async () => {
      const res = await authClient.signIn.anonymous();
      if (res.error) {
        setError(res.error.message ?? 'Could not start a guest session.');
        return;
      }
      router.push(next && next.startsWith('/') ? next : '/onboarding');
      router.refresh();
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full max-w-sm"
    >
      <div className="rounded-3xl border bg-card/90 p-6 shadow-[0_30px_80px_-40px_oklch(0.38_0.06_45/0.5)] backdrop-blur sm:p-8">
        <div className="mb-6 space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{isGuest && mode === 'sign-up' ? 'Keep everything you did as a guest.' : copy.subtitle}</p>
        </div>

        {providers.length > 0 && (
          <>
            <div className="grid gap-2">
              {providers.map((p) => (
                <Button key={p} type="button" variant="outline" size="xl" disabled={pending} onClick={() => social(p)}>
                  {p === 'google' ? <GoogleIcon /> : <GitHubIcon />}
                  Continue with {p === 'google' ? 'Google' : 'GitHub'}
                </Button>
              ))}
            </div>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <Separator className="flex-1" /> or with email <Separator className="flex-1" />
            </div>
          </>
        )}

        <form action={onSubmit} className="grid gap-4">
          {mode === 'sign-up' && (
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" autoComplete="name" placeholder="Ada Lovelace" className="h-11" />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="h-11" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                placeholder={mode === 'sign-up' ? 'At least 8 characters' : '••••••••'}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" variant="premium" size="xl" disabled={pending} className="mt-1">
            {pending ? <Spinner /> : null}
            {copy.cta}
            {!pending && <ArrowRight data-icon="inline-end" />}
          </Button>
        </form>

        {!isGuest && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <Separator className="flex-1" /> just looking? <Separator className="flex-1" />
            </div>
            <Button type="button" variant="ghost" size="xl" className="w-full" disabled={pending} onClick={guest}>
              <UserRound /> Try it as a guest
            </Button>
          </>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {copy.switchText}{' '}
        <Link href={next ? `${copy.switchHref}?next=${encodeURIComponent(next)}` : copy.switchHref} className="font-medium text-primary hover:underline">
          {copy.switchLink}
        </Link>
      </p>
    </motion.div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.6 2.3 12s4.3 9.8 9.7 9.8c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="currentColor">
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

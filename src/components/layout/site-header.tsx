import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { MARKETING_NAV } from '@/lib/nav';
import { getOrCreateProfile, getStreak } from '@/server/profile';
import { getUser } from '@/server/session';
import { AppNav } from './app-nav';
import { StreakChip } from './streak-chip';
import { UserMenu } from './user-menu';

/** Signed-in people get the app navigation; visitors get the marketing links. */
export async function SiteHeader() {
  const user = await getUser();
  const [profile, streak] = user ? await Promise.all([getOrCreateProfile(user.id), getStreak(user.id)]) : [null, null];

  return (
    <header className="sticky top-0 z-40 print:hidden border-b border-border/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo href={user ? '/dashboard' : '/'} />
        {user ? (
          <div className="flex flex-1 justify-center">
            <AppNav />
          </div>
        ) : (
          <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {MARKETING_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          {user && streak && profile ? (
            <>
              <StreakChip days={streak.current} activeToday={streak.activeToday} todayItems={streak.today.items} goal={profile.dailyGoal} />
              <ThemeToggle />
              <UserMenu user={{ name: user.name, email: user.email, image: user.image, role: user.role as string, isAnonymous: user.isAnonymous }} />
            </>
          ) : (
            <>
              <ThemeToggle />
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild variant="premium">
                <Link href="/sign-up">Start free</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

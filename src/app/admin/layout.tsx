import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AdminNav } from '@/components/admin/admin-nav';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { openReportCount } from '@/server/admin/moderation';
import { requireRole } from '@/server/session';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · quizzMonkey admin' } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The count reveals nothing on its own and is only rendered once the role check passes, so both share a round trip.
  const [user, openReports] = await Promise.all([requireRole('author', 'admin'), openReportCount()]);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo href="/admin" />
          <span className="rounded-full bg-gradient-brand px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-white uppercase">Admin</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard"><ArrowLeft /> Back to app</Link></Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[13rem_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Suspense><AdminNav openReports={openReports} isAdmin={user.role === 'admin'} /></Suspense>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

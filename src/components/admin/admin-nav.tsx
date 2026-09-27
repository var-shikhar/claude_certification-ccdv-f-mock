'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { FileQuestion, Flag, LayoutDashboard, Sparkles, Upload, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/questions', label: 'Questions', icon: FileQuestion },
  { href: '/admin/generate', label: 'AI drafts', icon: Sparkles },
  { href: '/admin/reports', label: 'Reports', icon: Flag, badge: 'reports' as const },
  { href: '/admin/import', label: 'Import & export', icon: Upload },
  { href: '/admin/users', label: 'Users', icon: Users, adminOnly: true },
];

export function AdminNav({ openReports, isAdmin }: { openReports: number; isAdmin: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const exam = params.get('exam');
  return (
    <nav aria-label="Admin" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {ITEMS.filter((i) => !i.adminOnly || isAdmin).map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={exam ? `${item.href}?exam=${exam}` : item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
            )}
          >
            <item.icon className={cn('size-4', active && 'text-primary')} />
            {item.label}
            {item.badge === 'reports' && openReports > 0 && (
              <span className="ml-auto rounded-full bg-primary px-1.5 py-px text-[0.65rem] font-semibold text-primary-foreground tabular-nums">{openReports}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { APP_NAV, isActive } from '@/lib/nav';
import { cn } from '@/lib/utils';

/** Desktop top navigation: four destinations with a sliding active pill. */
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {APP_NAV.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId="app-nav-pill"
                className="absolute inset-0 -z-10 rounded-full bg-secondary ring-1 ring-border"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="inline-flex items-center gap-1.5">
              {item.label}
              {item.badge && (
                <span className="rounded-full bg-gradient-brand px-1.5 py-px text-[0.6rem] font-semibold tracking-wide text-white">{item.badge}</span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Phone navigation: the same four destinations as a bottom tab bar. */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 pb-safe backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {APP_NAV.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 pt-2.5 pb-1 text-[0.7rem] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {active && (
                  <motion.span layoutId="tab-indicator" className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
                )}
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

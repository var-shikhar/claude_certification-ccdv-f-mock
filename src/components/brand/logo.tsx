import Link from 'next/link';
import { cn } from '@/lib/utils';

/** The quizMonkey mark: a friendly monkey face in cocoa and banana. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8', className)}>
      <defs>
        <linearGradient id="cm-fur" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9a5b2c" />
          <stop offset="1" stopColor="#5f3417" />
        </linearGradient>
        <linearGradient id="cm-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe0a3" />
          <stop offset="1" stopColor="#f6b865" />
        </linearGradient>
      </defs>
      <circle cx="6.5" cy="15" r="4.6" fill="url(#cm-fur)" />
      <circle cx="25.5" cy="15" r="4.6" fill="url(#cm-fur)" />
      <circle cx="6.5" cy="15" r="2.4" fill="url(#cm-face)" />
      <circle cx="25.5" cy="15" r="2.4" fill="url(#cm-face)" />
      <circle cx="16" cy="15.5" r="10.5" fill="url(#cm-fur)" />
      <path d="M16 26c-4.6 0-7.6-2.6-7.6-6.1 0-1.7.7-3 1.8-3.9-.5-.6-.8-1.4-.8-2.2 0-2 1.6-3.6 3.6-3.6 1.2 0 2.3.6 3 1.5.7-.9 1.8-1.5 3-1.5 2 0 3.6 1.6 3.6 3.6 0 .8-.3 1.6-.8 2.2 1.1.9 1.8 2.2 1.8 3.9 0 3.5-3 6.1-7.6 6.1Z" fill="url(#cm-face)" />
      <circle cx="12.9" cy="15.2" r="1.35" fill="#2b170a" />
      <circle cx="19.1" cy="15.2" r="1.35" fill="#2b170a" />
      <circle cx="13.3" cy="14.8" r="0.4" fill="#fff" />
      <circle cx="19.5" cy="14.8" r="0.4" fill="#fff" />
      <path d="M13.4 21.1c1.5 1.4 3.7 1.4 5.2 0" stroke="#2b170a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="18.9" r="0.55" fill="#2b170a" />
      <path d="M22.6 5.2l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.2-2.3 1.2.4-2.6-1.9-1.8 2.7-.4z" fill="#f5c542" stroke="#e8912b" strokeWidth="0.5" />
    </svg>
  );
}

export function Logo({ className, href = '/', compact = false }: { className?: string; href?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn('group inline-flex items-center gap-2 font-heading text-lg font-semibold tracking-tight', className)} aria-label="quizMonkey home">
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      {!compact && (
        <span>
          quiz<span className="text-primary">Monkey</span>
        </span>
      )}
    </Link>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Fades content up: on first paint for what is already on screen, and the first
 * time it scrolls into view for the rest. The animation is CSS (`.reveal` in
 * globals.css), so content is in the server HTML, visible without JavaScript and
 * never holds back the largest paint. After hydration, sections that start below
 * the fold wait until they are scrolled to.
 */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // on screen at load: its entrance already played
    el.dataset.reveal = 'waiting';
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      delete el.dataset.reveal;
      observer.disconnect();
    }, { rootMargin: '0px 0px -60px 0px' });
    observer.observe(el);
    return () => {
      observer.disconnect();
      delete el.dataset.reveal;
    };
  }, []);
  return (
    <div ref={ref} className={cn('reveal', className)} style={delay ? ({ '--reveal-delay': `${delay}s` } as React.CSSProperties) : undefined}>
      {children}
    </div>
  );
}

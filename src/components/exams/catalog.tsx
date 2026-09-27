'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { ExamCard as ExamCardData } from '@/server/exams';
import { cn } from '@/lib/utils';
import { ExamCard } from './exam-card';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'certification', label: 'Certifications' },
  { key: 'quiz', label: 'Quizzes' },
  { key: 'interview', label: 'Interview prep' },
] as const;

export function Catalog({ exams, readiness }: { exams: ExamCardData[]; readiness: Record<string, number | null> }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['key']>('all');
  const present = new Set(exams.map((e) => e.category));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exams.filter((e) => (category === 'all' || e.category === category)
      && (!q || [e.code, e.title, e.vendor, e.meta.tagline, ...(e.meta.tags ?? [])].join(' ').toLowerCase().includes(q)));
  }, [exams, query, category]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search exams, vendors, topics…" className="h-11 rounded-xl pl-10" aria-label="Search exams" />
        </div>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {CATEGORIES.filter((c) => c.key === 'all' || present.has(c.key)).map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              aria-pressed={category === c.key}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                category === c.key ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/40 hover:bg-accent/40',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-12 text-center">
          <p className="font-medium">No exams match “{query}”.</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a vendor name or a shorter search.</p>
        </div>
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((exam) => (
              <motion.div key={exam.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                <ExamCard exam={exam} readiness={readiness[exam.id]} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

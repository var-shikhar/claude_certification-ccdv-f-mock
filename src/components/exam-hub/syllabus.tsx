'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, ChevronDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStartAttempt } from '@/hooks/use-start-attempt';
import type { ExamConfig } from '@/lib/engine/types';
import type { MasteryLevel, SkillMastery } from '@/lib/readiness';
import { cn } from '@/lib/utils';

const LEVEL: Record<MasteryLevel, { label: string; className: string; bar: string }> = {
  new: { label: 'Not started', className: 'bg-muted text-muted-foreground', bar: 'bg-muted-foreground/30' },
  weak: { label: 'Needs work', className: 'bg-destructive/10 text-destructive', bar: 'bg-destructive/70' },
  fair: { label: 'Getting there', className: 'bg-banana/25 text-cocoa dark:text-banana', bar: 'bg-banana' },
  strong: { label: 'Strong', className: 'bg-success/12 text-success', bar: 'bg-success' },
};

/**
 * The exam's domains and skills. Each domain is a native <details>, so every
 * skill and study-note link is in the HTML (crawlers and find-in-page see them)
 * even while collapsed. `pending` renders the public version with drills
 * disabled while the learner's own mastery loads.
 */
export function Syllabus({ exam, mastery, counts, studySkills, signedIn, pending = false }: {
  exam: ExamConfig;
  mastery: SkillMastery[] | null;
  counts: Record<string, number>;
  studySkills: string[];
  signedIn: boolean;
  pending?: boolean;
}) {
  const router = useRouter();
  const start = useStartAttempt();
  const bySkill = new Map(mastery?.map((m) => [m.skillId, m]) ?? []);
  const hasStudy = new Set(studySkills);
  const drill = (skillId: string) => (signedIn
    ? start.mutate({ examId: exam.id, kind: 'practice', skills: [skillId], count: 10 })
    : router.push(`/sign-up?next=/exams/${exam.id}`));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Syllabus</h2>
          <p className="text-sm text-muted-foreground">{exam.domains.length} domains · {exam.skills.length} skills, weighted like the official blueprint.</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {exam.domains.map((d) => {
          const skills = exam.skills.filter((s) => s.domain === d.id);
          const touched = skills.map((s) => bySkill.get(s.id)).filter((m): m is SkillMastery => Boolean(m && m.answered));
          const domainMastery = touched.length
            ? Math.round((touched.reduce((a, m) => a + m.mastery * m.weight, 0) / touched.reduce((a, m) => a + m.weight, 0)) * 100)
            : null;
          return (
            <details key={d.id} className="group overflow-hidden rounded-2xl border bg-card">
              <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary font-heading text-sm font-semibold">{d.id}</span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-semibold">{d.name}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{d.weight}% of the exam · {skills.length} skills</span>
                </span>
                <span className="hidden w-32 shrink-0 sm:block">
                  <span className="flex justify-between text-xs text-muted-foreground"><span>Mastery</span><span className="font-semibold text-foreground">{domainMastery == null ? '—' : `${domainMastery}%`}</span></span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-secondary">
                    <span className="block h-full rounded-full bg-gradient-brand transition-all duration-700" style={{ width: `${domainMastery ?? 0}%` }} />
                  </span>
                </span>
                <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <ul className="divide-y border-t text-sm animate-in fade-in slide-in-from-top-1">
                {skills.map((s) => {
                  const m = bySkill.get(s.id);
                  const level = LEVEL[m?.level ?? 'new'];
                  const pct = m?.answered ? Math.round(m.mastery * 100) : 0;
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{s.name}</span>
                          <span className={cn('rounded-full px-2 py-0.5 text-[0.65rem] font-semibold', level.className)}>{level.label}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="h-1 w-24 overflow-hidden rounded-full bg-secondary">
                            <span className={cn('block h-full rounded-full transition-all duration-700', level.bar)} style={{ width: `${pct}%` }} />
                          </span>
                          <span className="text-xs text-muted-foreground">{s.weight}% · {counts[s.id] ?? 0} questions{m?.answered ? ` · ${m.answered} answered` : ''}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {hasStudy.has(s.id) && (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/exams/${exam.id}/study/${s.id}`}><BookOpen /> Notes</Link>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" disabled={pending || start.isPending || !(counts[s.id] ?? 0)} onClick={() => drill(s.id)}>
                          <Zap /> Drill
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </section>
  );
}

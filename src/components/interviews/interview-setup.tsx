'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, BarChart3, Boxes, BrainCircuit, Code2, Layout, Server, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { api } from '@/lib/api';
import { INTERVIEW_FOCUS, INTERVIEW_LENGTHS, INTERVIEW_LEVELS, INTERVIEW_ROLES, type InterviewFocusId } from '@/lib/interview-presets';
import { cn } from '@/lib/utils';

const ICONS: Record<string, typeof Code2> = {
  frontend: Layout, backend: Server, fullstack: Boxes, 'ai-engineer': BrainCircuit, devops: Workflow, 'data-scientist': BarChart3, 'product-manager': Code2,
};

export function InterviewSetup({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [role, setRole] = useState<string>('fullstack');
  const [level, setLevel] = useState<string>('mid');
  const [focus, setFocus] = useState<InterviewFocusId>('mixed');
  const [length, setLength] = useState('5');

  const start = useMutation({
    mutationFn: () => api.post<{ id: string }>('/api/interviews', { role, level, focus, questionTarget: Number(length) }),
    onSuccess: ({ id }) => router.push(`/interviews/${id}`),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not start the interview.'),
  });

  return (
    <section className="space-y-6 rounded-3xl border bg-card p-5 sm:p-7">
      <div className="space-y-3">
        <h2 className="font-semibold">1. The role</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {INTERVIEW_ROLES.map((r) => {
            const Icon = ICONS[r.id] ?? Code2;
            const active = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                aria-pressed={active}
                className={cn('flex items-center gap-2.5 rounded-2xl border p-3 text-left text-sm transition-all', active ? 'border-primary bg-primary/[0.06] shadow-[0_0_0_1px_var(--primary)]' : 'hover:border-primary/40')}
              >
                <Icon className={cn('size-5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                <span className="font-medium">{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Choice title="2. Level" value={level} onChange={setLevel} items={INTERVIEW_LEVELS.map((l) => ({ value: l.id, label: l.label, hint: l.blurb }))} />
        <Choice title="3. Focus" value={focus} onChange={(v) => setFocus(v as InterviewFocusId)} items={INTERVIEW_FOCUS.map((f) => ({ value: f.id, label: f.label, hint: f.blurb }))} />
        <Choice title="4. Length" value={length} onChange={setLength} items={INTERVIEW_LENGTHS.map((n) => ({ value: String(n), label: `${n} questions`, hint: `~${n * 4} min` }))} />
      </div>

      <div className="flex flex-col items-start justify-between gap-3 border-t pt-5 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">Answer in your own words. You&apos;ll get a scored rubric with specific tips at the end.</p>
        {signedIn ? (
          <Button variant="premium" size="xl" disabled={start.isPending} onClick={() => start.mutate()}>
            {start.isPending ? <Spinner /> : null} Start interview <ArrowRight data-icon="inline-end" />
          </Button>
        ) : (
          <Button variant="premium" size="xl" onClick={() => router.push('/sign-up?next=/interviews')}>Sign up to start <ArrowRight data-icon="inline-end" /></Button>
        )}
      </div>
    </section>
  );
}

function Choice({ title, value, onChange, items }: { title: string; value: string; onChange: (v: string) => void; items: { value: string; label: string; hint: string }[] }) {
  return (
    <div className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      <ToggleGroup type="single" orientation="vertical" value={value} onValueChange={(v) => v && onChange(v)} className="grid w-full gap-1.5">
        {items.map((i) => (
          <ToggleGroupItem key={i.value} value={i.value} className="h-auto justify-between rounded-xl border px-3 py-2 data-[state=on]:border-primary data-[state=on]:bg-primary/[0.06]">
            <span className="font-medium">{i.label}</span>
            <span className="text-xs text-muted-foreground">{i.hint}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { CalendarDays, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { useStartAttempt } from '@/hooks/use-start-attempt';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { useHubUi, type SetupKind } from '@/stores/hub-ui';
import type { StartInput } from '@/server/attempts';

export function OpenSetupButton({ kind, children, ...props }: { kind: SetupKind; children: React.ReactNode } & Omit<React.ComponentProps<typeof Button>, 'onClick'>) {
  const openSetup = useHubUi((s) => s.openSetup);
  return <Button {...props} onClick={() => openSetup(kind)}>{children}</Button>;
}

/** Visitors can try the diagnostic straight away as a guest. */
export function GuestDiagnosticButton({ examId }: { examId: string }) {
  return <GuestStartButton input={{ examId, kind: 'diagnostic' }} label="Try the free diagnostic" />;
}

/** Starts an attempt for a visitor by opening a guest session first; progress carries over on sign-up. */
export function GuestStartButton({ input, label }: { input: StartInput; label: string }) {
  const router = useRouter();
  const start = useStartAttempt();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const res = await authClient.signIn.anonymous();
    if (res.error) {
      setBusy(false);
      toast.error(res.error.message ?? 'Could not start a guest session.');
      return;
    }
    router.refresh();
    start.mutate(input, { onSettled: () => setBusy(false) });
  }
  return (
    <Button variant="premium" size="xl" onClick={go} disabled={busy}>
      {busy ? <Spinner /> : <Sparkles data-icon="inline-start" />}
      {label}
    </Button>
  );
}

/** Small popover to set or change the exam date (drives the countdown and study plan). */
export function ExamDateButton({ examId, targetDate, daysLeft }: { examId: string; targetDate: string | null; daysLeft: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(targetDate ?? '');
  const save = useMutation({
    mutationFn: (date: string | null) => api.post('/api/enrollments', { examId, targetDate: date }),
    onSuccess: () => { setOpen(false); toast.success('Exam date saved'); router.refresh(); },
    onError: () => toast.error('Could not save the date.'),
  });
  const days = daysLeft;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <CalendarDays />
          {days == null ? 'Set exam date' : days > 0 ? `Exam in ${days} day${days === 1 ? '' : 's'}` : days === 0 ? 'Exam is today!' : 'Exam date passed'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <div>
          <p className="text-sm font-semibold">When is your exam?</p>
          <p className="text-xs text-muted-foreground">We&apos;ll count down and pace your study plan.</p>
        </div>
        <Input type="date" value={value} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setValue(e.target.value)} />
        <div className="flex justify-between gap-2">
          {targetDate && <Button variant="ghost" size="sm" onClick={() => save.mutate(null)}>Clear</Button>}
          <Button size="sm" className="ml-auto" disabled={!value || save.isPending} onClick={() => save.mutate(value)}>Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

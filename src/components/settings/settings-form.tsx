'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { ManageBillingButton } from '@/components/billing/billing-buttons';
import Link from 'next/link';

interface Settings { name: string; email: string; isAnonymous: boolean; dailyGoal: number; timezone: string; leaderboardOptIn: boolean; plan: 'free' | 'pro'; billing: boolean }

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(initial.name);
  const [prefs, setPrefs] = useState({ dailyGoal: initial.dailyGoal, timezone: initial.timezone, leaderboardOptIn: initial.leaderboardOptIn });
  const [confirmText, setConfirmText] = useState('');

  // Preferences save optimistically: the control moves at once, and snaps back if the server refuses.
  const savePrefs = useMutation({
    mutationFn: (patch: Partial<typeof prefs>) => api.patch<typeof prefs>('/api/settings', patch),
    onMutate: (patch) => {
      const previous = prefs;
      setPrefs((p) => ({ ...p, ...patch }));
      return { previous };
    },
    onError: (err, _patch, ctx) => {
      if (ctx) setPrefs(ctx.previous);
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    },
    onSuccess: () => { toast.success('Saved', { duration: 1200 }); router.refresh(); },
  });

  const saveName = useMutation({
    mutationFn: async () => {
      const res = await authClient.updateUser({ name: name.trim() });
      if (res.error) throw new Error(res.error.message ?? 'Could not update your name.');
    },
    onSuccess: () => { toast.success('Name updated'); router.refresh(); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update your name.'),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const res = await authClient.deleteUser();
      if (res.error) throw new Error(res.error.message ?? 'Could not delete your account.');
    },
    onSuccess: () => { toast.success('Your account and data were deleted.'); router.push('/'); router.refresh(); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not delete your account.'),
  });

  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [prefs.timezone];

  return (
    <div className="space-y-6">
      <Section title="Profile" description={initial.isAnonymous ? 'You are using a guest session on this device.' : initial.email}>
        {initial.isAnonymous ? (
          <Button asChild variant="premium"><a href="/sign-up">Create a free account to keep your progress</a></Button>
        ) : (
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); saveName.mutate(); }}>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-11" />
            </div>
            <Button type="submit" variant="outline" className="h-11 self-end" disabled={!name.trim() || name.trim() === initial.name || saveName.isPending}>Save</Button>
          </form>
        )}
      </Section>

      <Section title="Practice" description="Your daily goal drives the ring on Home and your streak reminders.">
        <div className="space-y-2">
          <Label>Daily goal</Label>
          <ToggleGroup type="single" variant="outline" value={String(prefs.dailyGoal)} onValueChange={(v) => v && savePrefs.mutate({ dailyGoal: Number(v) })} className="w-full sm:w-auto">
            {[5, 10, 20, 40].map((n) => <ToggleGroupItem key={n} value={String(n)} className="flex-1 px-4">{n} questions</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tz">Time zone</Label>
          <select
            id="tz"
            value={prefs.timezone}
            onChange={(e) => savePrefs.mutate({ timezone: e.target.value })}
            className="h-11 w-full rounded-lg border bg-background px-3 text-sm sm:max-w-sm"
          >
            {zones.map((z) => <option key={z} value={z}>{z.replaceAll('_', ' ')}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">Streaks roll over at midnight in this time zone.</p>
        </div>
        <Label className="flex items-center justify-between gap-4 rounded-2xl border p-4 font-normal">
          <span><span className="block text-sm font-semibold">Show me on leaderboards</span><span className="text-xs text-muted-foreground">Only your display name and XP are shown.</span></span>
          <Switch checked={prefs.leaderboardOptIn} onCheckedChange={(v) => savePrefs.mutate({ leaderboardOptIn: v })} />
        </Label>
      </Section>

      {initial.billing && !initial.isAnonymous && (
        <Section title="Plan" description={initial.plan === 'pro' ? 'You are on Pro. Thanks for supporting quizMonkey!' : 'You are on the free plan.'}>
          {initial.plan === 'pro' ? <ManageBillingButton /> : <Button asChild variant="premium"><Link href="/pricing">See Pro</Link></Button>}
        </Section>
      )}

      <Section title="Appearance" description="quizMonkey follows your device by default.">
        <ToggleGroup type="single" variant="outline" value={theme ?? 'system'} onValueChange={(v) => v && setTheme(v)}>
          <ToggleGroupItem value="light" className="px-4"><Sun /> Light</ToggleGroupItem>
          <ToggleGroupItem value="dark" className="px-4"><Moon /> Dark</ToggleGroupItem>
          <ToggleGroupItem value="system" className="px-4"><Monitor /> System</ToggleGroupItem>
        </ToggleGroup>
      </Section>

      <Section title="Danger zone" description="Permanently delete your account, attempts, notes and certificates." danger>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="destructive">Delete my account</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>This removes everything: attempts, analytics, saved questions and certificates. It cannot be undone. Type <b>delete</b> to confirm.</AlertDialogDescription>
            </AlertDialogHeader>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="delete" aria-label="Type delete to confirm" />
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my account</AlertDialogCancel>
              <AlertDialogAction variant="destructive" disabled={confirmText.trim().toLowerCase() !== 'delete' || remove.isPending} onClick={(e) => { e.preventDefault(); remove.mutate(); }}>
                Delete forever
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Section>
    </div>
  );
}

function Section({ title, description, children, danger }: { title: string; description?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section className={danger ? 'space-y-4 rounded-3xl border border-destructive/30 p-5 sm:p-6' : 'space-y-4 rounded-3xl border bg-card p-5 sm:p-6'}>
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

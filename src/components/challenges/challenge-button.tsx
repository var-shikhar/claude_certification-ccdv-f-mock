'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Copy, Share2, Swords } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';

/** Turns this result into a link friends can use to take the exact same questions. */
export function ChallengeButton({ attemptId, examCode }: { attemptId: string; examCode: string }) {
  const [link, setLink] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: () => api.post<{ id: string }>('/api/challenges', { attemptId }),
    onSuccess: ({ id }) => setLink(`${window.location.origin}/challenge/${id}`),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not create the challenge.'),
  });

  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); toast.success('Link copied'); } catch { toast.error('Copy failed. Select the link and copy it.'); }
  }
  async function share() {
    if (!link) return;
    try { await navigator.share({ title: `Beat my ${examCode} score on quizMonkey`, url: link }); } catch { /* dismissed */ }
  }

  return (
    <>
      <Button variant="outline" size="xl" disabled={create.isPending} onClick={() => (link ? setLink(link) : create.mutate())}>
        {create.isPending ? <Spinner /> : <Swords data-icon="inline-start" />} Challenge a friend
      </Button>
      <Dialog open={Boolean(link)} onOpenChange={(o) => !o && setLink(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your challenge is ready</DialogTitle>
            <DialogDescription>Friends get the same questions in the same order and time limit. Scores land on a shared leaderboard, and they can try it as a guest.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={link ?? ''} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" aria-label="Challenge link" />
            <Button variant="outline" size="icon" onClick={copy} aria-label="Copy link"><Copy /></Button>
          </div>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button variant="premium" onClick={share}><Share2 /> Share</Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

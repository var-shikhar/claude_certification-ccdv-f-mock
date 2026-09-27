'use client';

import { CircleAlert, Flag } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';

export function FinishDialog({
  open, onOpenChange, total, answered, flagged, isDrill, pending, onSubmit, onReviewFlagged, onReviewUnanswered,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  answered: number;
  flagged: number;
  isDrill: boolean;
  pending: boolean;
  onSubmit: () => void;
  onReviewFlagged: () => void;
  onReviewUnanswered: () => void;
}) {
  const unanswered = total - answered;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isDrill ? 'Finish this drill?' : 'Submit your exam?'}</AlertDialogTitle>
          <AlertDialogDescription>
            {isDrill
              ? 'You can see your results and review every question next.'
              : "Once you submit, you can't change your answers. You'll get your score and a full review straight away."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border bg-secondary/40 p-3"><div className="font-heading text-xl font-semibold">{answered}</div><div className="text-xs text-muted-foreground">answered</div></div>
          <button type="button" onClick={onReviewUnanswered} disabled={!unanswered} className="rounded-xl border bg-secondary/40 p-3 transition enabled:hover:border-primary/40 disabled:opacity-60">
            <div className="font-heading text-xl font-semibold">{unanswered}</div><div className="text-xs text-muted-foreground">unanswered</div>
          </button>
          <button type="button" onClick={onReviewFlagged} disabled={!flagged} className="rounded-xl border bg-secondary/40 p-3 transition enabled:hover:border-primary/40 disabled:opacity-60">
            <div className="font-heading text-xl font-semibold">{flagged}</div><div className="text-xs text-muted-foreground">flagged</div>
          </button>
        </div>

        {unanswered > 0 && !isDrill && (
          <p className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            Unanswered questions score zero. There is no penalty for guessing.
          </p>
        )}
        {flagged > 0 && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Flag className="size-3.5" /> Tap a number above to jump back and check them.</p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Keep working</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); onSubmit(); }}
            disabled={pending}
            className="bg-gradient-brand text-white shadow-glow hover:brightness-105"
          >
            {pending && <Spinner />}
            {isDrill ? 'Finish drill' : 'Submit exam'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

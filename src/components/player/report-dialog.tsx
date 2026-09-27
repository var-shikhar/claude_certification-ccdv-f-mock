'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

const REASONS = [
  { value: 'wrong-key', label: 'The marked answer is wrong' },
  { value: 'unclear', label: 'The question is unclear' },
  { value: 'outdated', label: 'It is out of date' },
  { value: 'typo', label: 'Typo or formatting problem' },
  { value: 'other', label: 'Something else' },
] as const;

export function ReportDialog({ questionId, open, onOpenChange }: { questionId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('wrong-key');
  const [message, setMessage] = useState('');
  const report = useMutation({
    mutationFn: () => api.post('/api/reports', { questionId, reason, message }),
    onSuccess: () => {
      toast.success('Thanks! Our authors will take a look.');
      setMessage('');
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not send the report.'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this question</DialogTitle>
          <DialogDescription>Reports go straight to the people who write the questions. Your exam timer keeps running.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={(v) => setReason(v as typeof reason)} className="gap-2.5">
          {REASONS.map((r) => (
            <Label key={r.value} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
              <RadioGroupItem value={r.value} /> {r.label}
            </Label>
          ))}
        </RadioGroup>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional: tell us more (a doc link helps)" maxLength={2000} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => report.mutate()} disabled={report.isPending}>Send report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

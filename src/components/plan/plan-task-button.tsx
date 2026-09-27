'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { StartButton } from '@/components/results/start-button';
import { Button } from '@/components/ui/button';
import type { PlanTask } from '@/lib/study-plan';

/** Starts whatever a plan task needs. Timed mocks go through the exam's setup sheet (rules + difficulty). */
export function PlanTaskButton({ examId, task, size = 'sm', variant = 'outline', label }: {
  examId: string; task: PlanTask; size?: 'sm' | 'xl'; variant?: 'outline' | 'premium'; label?: string;
}) {
  const text = label ?? 'Start';
  switch (task.kind) {
    case 'diagnostic':
      return <StartButton size={size} variant={variant} input={{ examId, kind: 'diagnostic' }}>{text}</StartButton>;
    case 'review':
      return <StartButton size={size} variant={variant} input={{ examId, kind: 'review', count: task.count }}>{text}</StartButton>;
    case 'drill':
      return <StartButton size={size} variant={variant} input={{ examId, kind: 'practice', skills: task.skillId ? [task.skillId] : undefined, count: task.count }}>{text}</StartButton>;
    case 'quick':
    case 'full':
      return <Button asChild size={size} variant={variant}><Link href={`/exams/${examId}?start=${task.kind}`}>{text} <ArrowRight data-icon="inline-end" /></Link></Button>;
    default:
      return <Button asChild size={size} variant={variant}><Link href="/saved">Open saved</Link></Button>;
  }
}

import { Flame } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function StreakChip({ days, activeToday, todayItems, goal }: { days: number; activeToday: boolean; todayItems: number; goal: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            'inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-sm font-semibold tabular-nums transition-colors',
            activeToday ? 'border-primary/30 bg-primary/10 text-primary' : 'text-muted-foreground',
          )}
        >
          <Flame className={cn('size-4', activeToday && 'fill-banana/70')} />
          {days}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {days ? `${days}-day streak` : 'No streak yet'} · {Math.min(todayItems, goal)}/{goal} questions today
        {!activeToday && days > 0 ? ' · answer one question to keep it going' : ''}
      </TooltipContent>
    </Tooltip>
  );
}

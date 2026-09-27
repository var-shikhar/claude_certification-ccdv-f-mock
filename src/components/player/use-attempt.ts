'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type { PlayerState, ProgressPatch, RevealedItem } from '@/lib/dto';

export type SaveState = 'saved' | 'pending' | 'saving' | 'offline';

export const attemptKey = (id: string) => ['attempt', id] as const;

const SAVE_DEBOUNCE_MS = 700;

function mergePatch(into: ProgressPatch, patch: ProgressPatch): ProgressPatch {
  return {
    responses: patch.responses ? { ...into.responses, ...patch.responses } : into.responses,
    flags: patch.flags ? { ...into.flags, ...patch.flags } : into.flags,
    timeSpent: patch.timeSpent ? { ...into.timeSpent, ...patch.timeSpent } : into.timeSpent,
    current: patch.current ?? into.current,
  };
}

const isEmptyPatch = (p: ProgressPatch) =>
  !Object.keys(p.responses ?? {}).length && !Object.keys(p.flags ?? {}).length && !Object.keys(p.timeSpent ?? {}).length && p.current === undefined;

function applyPatch(state: PlayerState, patch: ProgressPatch): PlayerState {
  return {
    ...state,
    responses: patch.responses ? { ...state.responses, ...patch.responses } : state.responses,
    flags: patch.flags ? { ...state.flags, ...patch.flags } : state.flags,
    timeSpent: patch.timeSpent ? { ...state.timeSpent, ...patch.timeSpent } : state.timeSpent,
    current: patch.current ?? state.current,
  };
}

/**
 * Server state for one attempt. Every interaction updates the cache
 * optimistically and is batched into a debounced autosave; failed saves are
 * kept and retried, never rolled back, because they are the learner's answers.
 */
export function useAttempt(initial: PlayerState) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const key = attemptKey(initial.id);
  const url = `/api/attempts/${initial.id}`;

  const { data: state } = useQuery({
    queryKey: key,
    queryFn: () => api.get<PlayerState>(url),
    initialData: initial,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });

  const pending = useRef<ProgressPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const ended = useRef(false);

  const goToResult = useCallback((message?: string) => {
    if (ended.current) return;
    ended.current = true;
    if (message) toast.info(message);
    router.replace(`/attempt/${initial.id}/result`);
    router.refresh();
  }, [initial.id, router]);

  const handleEnded = useCallback((err: unknown) => {
    if (err instanceof ApiError && (err.code === 'TIME_UP' || err.code === 'ENDED')) {
      goToResult(err.code === 'TIME_UP' ? "Time's up. Your answers were submitted." : undefined);
      return true;
    }
    return false;
  }, [goToResult]);

  const save = useMutation({
    mutationFn: (patch: ProgressPatch) => api.patch<{ ok: true }>(url, patch),
    retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 4,
    retryDelay: (n) => Math.min(1000 * 2 ** n, 10_000),
    onMutate: () => setSaveState('saving'),
    onSuccess: () => setSaveState(isEmptyPatch(pending.current) ? 'saved' : 'pending'),
    onError: (err, patch) => {
      if (handleEnded(err)) return;
      // Keep the unsaved answers and try again shortly.
      pending.current = mergePatch(patch, pending.current);
      setSaveState('offline');
      timer.current = setTimeout(() => flushRef.current(), 8_000);
    },
  });

  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (isEmptyPatch(pending.current) || ended.current) return Promise.resolve();
    const patch = pending.current;
    pending.current = {};
    return save.mutateAsync(patch).then(() => undefined, () => undefined);
  }, [save]);
  const flushRef = useRef(flush);
  flushRef.current = flush;

  /** Optimistically apply a change and queue it for saving. */
  const update = useCallback((patch: ProgressPatch) => {
    queryClient.setQueryData<PlayerState>(key, (prev) => (prev ? applyPatch(prev, patch) : prev));
    pending.current = mergePatch(pending.current, patch);
    setSaveState((s) => (s === 'offline' ? s : 'pending'));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), SAVE_DEBOUNCE_MS);
  }, [queryClient, key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Last-chance save when the tab is hidden or closed.
  useEffect(() => {
    const beacon = () => {
      if (isEmptyPatch(pending.current) || ended.current) return;
      const body = new Blob([JSON.stringify(pending.current)], { type: 'application/json' });
      if (navigator.sendBeacon?.(url, body)) pending.current = {};
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') beacon(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', beacon);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', beacon);
    };
  }, [url]);

  const check = useMutation({
    mutationFn: ({ questionId, response }: { questionId: string; response: string[] }) =>
      api.post<RevealedItem>(`${url}/check`, { questionId, response }),
    onSuccess: (revealed, { questionId, response }) => {
      queryClient.setQueryData<PlayerState>(key, (prev) => prev && ({
        ...prev,
        responses: { ...prev.responses, [questionId]: response },
        checked: { ...prev.checked, [questionId]: true },
        revealed: { ...prev.revealed, [questionId]: revealed },
      }));
    },
    onError: (err) => {
      if (!handleEnded(err)) toast.error(err instanceof Error ? err.message : 'Could not check that answer.');
    },
  });

  const bookmark = useMutation({
    mutationFn: ({ questionId, on }: { questionId: string; on: boolean }) =>
      on ? api.post('/api/bookmarks', { questionId }) : api.delete(`/api/bookmarks/${questionId}`),
    onMutate: async ({ questionId, on }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PlayerState>(key);
      queryClient.setQueryData<PlayerState>(key, (prev) => prev && ({
        ...prev,
        bookmarks: on ? [...new Set([...prev.bookmarks, questionId])] : prev.bookmarks.filter((b) => b !== questionId),
      }));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast.error("Couldn't update your saved questions. Please try again.");
    },
    onSuccess: (_data, { on }) => {
      toast.success(on ? 'Saved for later' : 'Removed from saved questions', { duration: 1800 });
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      await flush();
      return api.post<{ id: string }>(`${url}/submit`);
    },
    onSuccess: () => goToResult(),
    onError: (err) => {
      if (!handleEnded(err)) toast.error(err instanceof Error ? err.message : 'Could not submit. Please try again.');
    },
  });

  const abandon = useMutation({
    mutationFn: () => api.post(`${url}/abandon`),
    onSuccess: () => {
      ended.current = true;
      router.replace(`/exams/${initial.examId}`);
      router.refresh();
    },
    onError: () => toast.error('Could not discard this attempt. Please try again.'),
  });

  return { state, saveState, update, flush, check, bookmark, submit, abandon, goToResult };
}

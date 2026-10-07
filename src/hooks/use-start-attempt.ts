'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type { StartInput } from '@/server/attempts';

/** Starts any kind of attempt and opens the player; one place handles "you already have one running". */
export function useStartAttempt() {
  const router = useRouter();
  const [opening, startOpening] = useTransition();
  const mutation = useMutation({
    mutationFn: (input: StartInput) => api.post<{ id: string }>('/api/attempts', input),
    // Inside a transition, so callers stay pending until the player has rendered (not just until the API
    // answered); otherwise the button re-enables early and a second click hits "already in progress".
    onSuccess: ({ id }) => startOpening(() => router.push(`/attempt/${id}`)),
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'ACTIVE_ATTEMPT') {
        const attemptId = typeof err.data?.attemptId === "string" ? err.data.attemptId : undefined;
        toast.info(err.message, {
          action: attemptId ? { label: 'Resume', onClick: () => router.push(`/attempt/${attemptId}`) } : undefined,
          duration: 8000,
        });
        return;
      }
      if (err instanceof ApiError && err.code === 'UPGRADE') {
        toast.info(err.message, { action: { label: 'See Pro', onClick: () => router.push('/pricing') }, duration: 10000 });
        return;
      }
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Could not start. Please try again.');
    },
  });
  return { ...mutation, isPending: mutation.isPending || opening };
}

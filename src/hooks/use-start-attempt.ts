'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import type { StartInput } from '@/server/attempts';

/** Starts any kind of attempt and opens the player; one place handles "you already have one running". */
export function useStartAttempt() {
  const router = useRouter();
  return useMutation({
    mutationFn: (input: StartInput) => api.post<{ id: string }>('/api/attempts', input),
    onSuccess: ({ id }) => router.push(`/attempt/${id}`),
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'ACTIVE_ATTEMPT') {
        const attemptId = typeof err.data?.attemptId === "string" ? err.data.attemptId : undefined;
        toast.info(err.message, {
          action: attemptId ? { label: 'Resume', onClick: () => router.push(`/attempt/${attemptId}`) } : undefined,
          duration: 8000,
        });
        return;
      }
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Could not start. Please try again.');
    },
  });
}

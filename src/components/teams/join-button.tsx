'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';

export function JoinTeamButton({ code }: { code: string }) {
  const router = useRouter();
  const join = useMutation({
    mutationFn: () => api.post<{ id: string; name: string }>('/api/teams/join', { code }),
    onSuccess: ({ id, name }) => { toast.success(`Welcome to ${name}`); router.push(`/teams/${id}`); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not join.'),
  });
  return <Button variant="premium" size="xl" disabled={join.isPending} onClick={() => join.mutate()}>{join.isPending && <Spinner />} Join team</Button>;
}

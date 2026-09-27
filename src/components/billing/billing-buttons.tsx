'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';

export function UpgradeButton({ label = 'Upgrade to Pro', className }: { label?: string; className?: string }) {
  const checkout = useMutation({
    mutationFn: () => api.post<{ url: string }>('/api/billing/checkout'),
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not start checkout.'),
  });
  return (
    <Button variant="premium" size="xl" className={className} disabled={checkout.isPending} onClick={() => checkout.mutate()}>
      {checkout.isPending && <Spinner />} {label}
    </Button>
  );
}

export function ManageBillingButton() {
  const portal = useMutation({
    mutationFn: () => api.post<{ url: string }>('/api/billing/portal'),
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not open billing.'),
  });
  return <Button variant="outline" disabled={portal.isPending} onClick={() => portal.mutate()}>{portal.isPending && <Spinner />} Manage billing</Button>;
}

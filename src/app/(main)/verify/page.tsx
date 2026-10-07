import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const metadata: Metadata = { title: 'Verify a certificate' };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  if (code?.trim()) redirect(`/verify/${encodeURIComponent(code.trim().toUpperCase())}`);
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <ShieldCheck className="mx-auto size-12 text-primary" />
      <h1 className="mt-4 text-3xl font-bold">Verify a certificate</h1>
      <p className="mt-2 text-muted-foreground">Enter the code printed at the bottom right of a quizzMonkey readiness certificate.</p>
      <form action="/verify" className="mt-8 flex gap-2">
        <Input name="code" required placeholder="CM-XXXXX-XXXXX" className="h-11 font-mono uppercase" autoComplete="off" aria-label="Certificate code" />
        <Button type="submit" variant="premium" size="xl">Verify</Button>
      </form>
    </div>
  );
}

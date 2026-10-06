import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCertificate } from '@/server/certificates';

export const metadata: Metadata = { title: 'Certificate verification' };

export default async function VerifyCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cert = await getCertificate(decodeURIComponent(code));
  if (!cert) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <ShieldX className="mx-auto size-12 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">No certificate with that code</h1>
        <p className="mt-2 text-muted-foreground">Check the code for typos. Codes look like <span className="font-mono">CM-XXXXX-XXXXX</span>.</p>
        <Button asChild variant="outline" className="mt-6"><Link href="/verify">Try another code</Link></Button>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-3xl border bg-card p-6 text-center sm:p-8">
        <BadgeCheck className="mx-auto size-12 text-success" />
        <h1 className="mt-4 text-2xl font-bold">Valid certificate</h1>
        <dl className="mt-6 grid gap-3 text-left text-sm">
          <Row label="Candidate" value={cert.candidateName} />
          <Row label="Exam" value={`${cert.examCode} · ${cert.examTitle}`} />
          <Row label="Score" value={`${cert.scaled} (pass mark ${cert.passing} of ${cert.scaleMax.toLocaleString()})`} />
          <Row label="Difficulty" value={cert.difficultyLabel} />
          <Row label="Issued" value={new Date(cert.issuedAt).toLocaleDateString(undefined, { dateStyle: 'long' })} />
          <Row label="Code" value={cert.id} mono />
        </dl>
        <Button asChild variant="outline" className="mt-6"><Link href={`/certificates/${cert.id}`}>View certificate</Link></Button>
        <p className="mt-4 text-xs text-muted-foreground">quizMonkey readiness certificates confirm a passing score on a full practice exam. They are not official vendor credentials.</p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? 'text-right font-mono font-semibold' : 'text-right font-medium'}>{value}</dd>
    </div>
  );
}

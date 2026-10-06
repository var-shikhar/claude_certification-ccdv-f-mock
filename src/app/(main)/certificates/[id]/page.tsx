import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { BadgeCheck } from 'lucide-react';
import { CertificateActions } from '@/components/certificates/certificate-actions';
import { CertificateCard } from '@/components/certificates/certificate-card';
import { getCertificate } from '@/server/certificates';
import { getUser } from '@/server/session';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const cert = await getCertificate((await params).id);
  return cert
    ? { title: `${cert.candidateName} · ${cert.examCode} readiness certificate`, description: `Verified quizMonkey readiness certificate: ${cert.scaled} on ${cert.examTitle}.` }
    : { title: 'Certificate not found' };
}

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cert = await getCertificate(id);
  if (!cert) notFound();
  const user = await getUser();
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host') ?? 'localhost:3000'}`;
  const verifyUrl = `${origin}/verify/${cert.id}`;
  const mine = user?.id === cert.userId;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 print:p-0">
      <div className="space-y-2 text-center print:hidden">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-sm font-medium text-success"><BadgeCheck className="size-4" /> Verified by quizMonkey</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{mine ? 'Your readiness certificate' : 'Readiness certificate'}</h1>
      </div>
      <CertificateCard cert={cert} verifyUrl={verifyUrl} />
      <CertificateActions url={verifyUrl} title={`${cert.examCode} readiness certificate`} />
      {mine && user?.isAnonymous && (
        <p className="text-center text-sm text-muted-foreground print:hidden">
          You&apos;re browsing as a guest. <Link href="/sign-up" className="font-medium text-primary hover:underline">Create a free account</Link> so you never lose this certificate.
        </p>
      )}
    </div>
  );
}

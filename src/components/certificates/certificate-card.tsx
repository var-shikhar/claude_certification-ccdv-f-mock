import { LogoMark } from '@/components/brand/logo';
import type { CertificateView } from '@/server/certificates';

/** The printable certificate itself (also used on the public verify page). */
export function CertificateCard({ cert, verifyUrl }: { cert: CertificateView; verifyUrl: string }) {
  const issued = new Date(cert.issuedAt).toLocaleDateString(undefined, { dateStyle: 'long' });
  return (
    <article className="certificate relative mx-auto aspect-[1.414/1] w-full max-w-3xl overflow-hidden rounded-3xl border-2 border-cocoa/20 bg-[oklch(0.99_0.012_85)] p-[5%] text-[oklch(0.28_0.04_50)] shadow-[0_40px_90px_-45px_oklch(0.38_0.06_45/0.6)] print:shadow-none">
      <div aria-hidden className="absolute inset-3 rounded-[1.25rem] border border-cocoa/15" />
      <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full bg-[oklch(0.86_0.16_90/0.25)] blur-3xl" />
      <div aria-hidden className="absolute -bottom-28 -left-24 size-72 rounded-full bg-[oklch(0.66_0.185_48/0.14)] blur-3xl" />

      <div className="relative flex h-full flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-heading text-lg font-semibold"><LogoMark className="size-9" /> cert<span className="text-[oklch(0.6_0.18_48)]">Monkey</span></div>
          <span className="rounded-full border border-cocoa/20 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.2em] uppercase">Readiness certificate</span>
        </header>

        <div className="my-auto space-y-3 text-center">
          <p className="text-xs tracking-[0.25em] uppercase opacity-70">This certifies that</p>
          <p className="font-heading text-[clamp(1.6rem,5vw,3rem)] leading-tight font-bold">{cert.candidateName}</p>
          <p className="mx-auto max-w-lg text-sm opacity-80 sm:text-base">
            passed a full-length, timed <b>{cert.examCode}</b> mock exam at <b>{cert.difficultyLabel}</b> difficulty, scoring above the passing standard for
          </p>
          <p className="font-heading text-lg font-semibold sm:text-2xl">{cert.examTitle}</p>
        </div>

        <footer className="grid grid-cols-3 items-end gap-4 text-xs">
          <div>
            <div className="font-heading text-2xl font-bold sm:text-3xl">{cert.scaled}</div>
            <div className="opacity-70">score · pass {cert.passing} of {cert.scaleMax.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{issued}</div>
            <div className="opacity-70">date issued</div>
          </div>
          <div className="text-right">
            <div className="font-mono font-semibold">{cert.id}</div>
            <div className="break-all opacity-70">verify at {verifyUrl.replace(/^https?:\/\//, '')}</div>
          </div>
        </footer>
        <p className="mt-3 text-center text-[0.6rem] opacity-55">
          An independent practice assessment by certMonkey. Not an official credential and not affiliated with {cert.vendor ?? 'the exam vendor'}.
        </p>
      </div>
    </article>
  );
}

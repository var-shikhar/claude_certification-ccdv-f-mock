import Link from 'next/link';
import { AlertTriangle, ArrowRight, FilePen, FileQuestion, Flag, Sparkles, Upload } from 'lucide-react';
import { ExamSwitcher } from '@/components/admin/exam-switcher';
import { Button } from '@/components/ui/button';
import { FLAG_INFO, type ItemFlag } from '@/server/admin/analysis';
import { openReportCount } from '@/server/admin/moderation';
import { getAdminOverview } from '@/server/admin/overview';
import { listExamsForAdmin } from '@/server/admin/questions';

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  const exams = await listExamsForAdmin();
  const { exam: examParam } = await searchParams;
  const exam = exams.find((e) => e.id === examParam) ?? exams[0];
  if (!exam) return <p className="text-muted-foreground">No exams yet. Seed content first.</p>;
  const [data, reports] = await Promise.all([getAdminOverview(exam.id), openReportCount()]);
  const q = (params: string) => `/admin/questions?exam=${exam.id}&${params}`;
  const flagged = Object.entries(data.flags) as [ItemFlag, number][];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-sm text-muted-foreground">Content health and activity for {exam.code}.</p>
        </div>
        <ExamSwitcher exams={exams} value={exam.id} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Published questions" value={data.byStatus.published ?? 0} href={q('status=published')} />
        <Stat label="Drafts" value={data.byStatus.draft ?? 0} href={q('status=draft')} />
        <Stat label="In review" value={data.byStatus.review ?? 0} href={q('status=review')} />
        <Stat label="Open reports" value={reports} href="/admin/reports" tone={reports ? 'warn' : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 text-primary" /> Needs attention</h2>
            <Button asChild variant="ghost" size="sm"><Link href={q('flagged=1&sort=p')}>Review all <ArrowRight data-icon="inline-end" /></Link></Button>
          </div>
          {flagged.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {data.analysed ? 'No statistical problems found.' : 'Item statistics appear once questions have 20+ answers.'} {data.analysed} question{data.analysed === 1 ? '' : 's'} analysed so far.
            </p>
          ) : (
            <ul className="divide-y">
              {flagged.map(([flag, n]) => (
                <li key={flag} className="flex items-center justify-between gap-3 py-2.5">
                  <span>
                    <span className="block text-sm font-medium">{FLAG_INFO[flag].label} · {n}</span>
                    <span className="text-xs text-muted-foreground">{FLAG_INFO[flag].hint}</span>
                  </span>
                  <Button asChild variant="outline" size="sm"><Link href={q('flagged=1&sort=p')}>Open</Link></Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Last 7 days</h2>
          <dl className="grid grid-cols-2 gap-3">
            <Mini label="Attempts started" value={data.attempts7} />
            <Mini label="Questions answered" value={data.answers7} />
            <Mini label="Registered learners" value={data.learners} />
            <Mini label="Items with stats" value={data.analysed} />
          </dl>
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Shortcut href={`/admin/questions/new?exam=${exam.id}`} icon={FilePen} title="Write a question" body="With live preview and validation." />
        <Shortcut href={`/admin/generate?exam=${exam.id}`} icon={Sparkles} title="Draft with AI" body="Generate drafts for review." />
        <Shortcut href="/admin/reports" icon={Flag} title="Triage reports" body="What learners flagged." />
        <Shortcut href={`/admin/import?exam=${exam.id}`} icon={Upload} title="Import or export" body="CSV and JSON." />
      </section>
    </div>
  );
}

function Stat({ label, value, href, tone }: { label: string; value: number; href: string; tone?: 'warn' }) {
  return (
    <Link href={href} className="rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={tone === 'warn' ? 'mt-1 font-heading text-2xl font-semibold text-primary' : 'mt-1 font-heading text-2xl font-semibold'}>{value.toLocaleString()}</div>
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-heading text-xl font-semibold">{value.toLocaleString()}</dd>
    </div>
  );
}

function Shortcut({ href, icon: Icon, title, body }: { href: string; icon: typeof FileQuestion; title: string; body: string }) {
  return (
    <Link href={href} className="group rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40">
      <Icon className="size-5 text-primary" />
      <div className="mt-2 text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{body}</div>
    </Link>
  );
}

import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { listExams } from '@/server/exams';

export async function SiteFooter() {
  // Cached catalogue. Every exam is linked from every page visitors (and crawlers) see.
  const exams = await listExams();
  return (
    <footer className="mt-24 border-t bg-secondary/30 print:hidden">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Mock exams, quizzes and interview practice in one calm place. Practise like it&apos;s exam day.
          </p>
        </div>
        <FooterCol title="Practise" links={[['Explore exams', '/explore'], ['Mock interviews', '/interviews'], ['Pricing', '/pricing']]} />
        <FooterCol title="Account" links={[['Sign in', '/sign-in'], ['Create account', '/sign-up'], ['Verify a certificate', '/verify']]} />
        <FooterCol title="About" links={[['How scoring works', '/about/scoring'], ['Privacy', '/about/privacy'], ['Terms', '/about/terms']]} />
      </div>
      {exams.length > 0 && (
        <nav aria-label="All exams" className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <h3 className="mb-3 text-sm font-semibold">Practice exams and mocks</h3>
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((e) => (
              <li key={e.id}>
                <Link href={`/exams/${e.id}`} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {e.title} <span className="text-xs">({e.code})</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} quizzMonkey. An independent practice platform, not affiliated with any exam vendor. Readiness certificates are not official credentials.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

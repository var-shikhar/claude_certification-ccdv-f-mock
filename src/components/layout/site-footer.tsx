import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-secondary/30">
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
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} certMonkey. An independent practice platform, not affiliated with any exam vendor. Readiness certificates are not official credentials.
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

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms' };

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold sm:text-4xl">Terms</h1>
        <p className="text-muted-foreground">The ground rules for using quizzMonkey.</p>
      </header>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Practice, not certification</h2>
        <p className="leading-relaxed text-muted-foreground">quizzMonkey is an independent practice platform. It is not affiliated with any exam vendor, and readiness certificates are not official credentials.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Fair use</h2>
        <p className="leading-relaxed text-muted-foreground">Use the questions for your own preparation. Do not scrape, resell or republish the question banks, and do not use AI features to generate harmful content.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Accuracy</h2>
        <p className="leading-relaxed text-muted-foreground">We work hard to keep questions correct and current, but mistakes happen. Use the Report button on any question and we will review it.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Accounts</h2>
        <p className="leading-relaxed text-muted-foreground">Keep your sign-in details safe. We may suspend accounts that abuse the service.</p>
      </section>
      <p className="text-xs text-muted-foreground">This summary is a starting template. Have it reviewed before you launch publicly.</p>
    </article>
  );
}

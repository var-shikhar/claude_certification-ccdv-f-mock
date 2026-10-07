import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'How scoring works' };

export default function ScoringPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold sm:text-4xl">How scoring works</h1>
        <p className="text-muted-foreground">quizzMonkey scores mocks the way certification exams report results, so a pass here means something.</p>
      </header>
      <Section title="Criterion-referenced">
        You&apos;re measured against a fixed standard, not against other candidates. Everyone who clears the bar passes.
      </Section>
      <Section title="No partial credit">
        Each question is all-or-nothing. A &ldquo;choose two&rdquo; question counts only when your selection matches the key exactly; ordering and matching questions need every position right. Unanswered questions score zero, so it always pays to answer.
      </Section>
      <Section title="Harder questions weigh more">
        Foundational questions count 1.0, Intermediate 1.5, Advanced 2.0 and Expert 2.5. Your difficulty-weighted percent correct maps linearly onto the exam&apos;s scale (for example 100–1,000), anchored so that a weighted 70% lands exactly on the pass mark (720).
      </Section>
      <Section title="Domain scores are informational">
        Your report shows percent correct per domain and skill to point you at weak spots. Pass or fail comes from the overall scaled score only.
      </Section>
      <Section title="Readiness and predicted score">
        Readiness blends your recent answers on every skill, weighting recent and harder questions more and starting each skill from a cautious 50% until you&apos;ve shown otherwise. The skills combine by their blueprint weights into a predicted score, and readiness is the chance that score clears the pass mark. With little data the estimate is deliberately modest.
      </Section>
      <p className="rounded-2xl border bg-secondary/50 p-4 text-sm text-muted-foreground">
        Official exams set their cut score through a confidential standard-setting study, so no practice platform can reproduce it exactly. Our mapping is a demanding approximation.
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="leading-relaxed text-muted-foreground">{children}</p>
    </section>
  );
}

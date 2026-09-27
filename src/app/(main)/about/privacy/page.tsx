import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy' };

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold sm:text-4xl">Privacy</h1>
        <p className="text-muted-foreground">What certMonkey stores about you, and why.</p>
      </header>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">What we store</h2>
        <p className="leading-relaxed text-muted-foreground">Your account details (name, email, sign-in method), your answers, scores and study notes, your streak and preferences, and anything you write in mock interviews. Guest sessions store the same data against an anonymous account on this device.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Why</h2>
        <p className="leading-relaxed text-muted-foreground">To score your attempts, track your readiness, schedule reviews, issue certificates and personalise your study plan. We do not sell your data.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">AI features</h2>
        <p className="leading-relaxed text-muted-foreground">When you use the tutor, mock interviews or other AI features, the relevant question or transcript is sent to our AI provider to generate a response.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Your choices</h2>
        <p className="leading-relaxed text-muted-foreground">You can hide yourself from leaderboards and delete your account at any time from Settings. Deleting your account removes your attempts, notes and certificates.</p>
      </section>
      <p className="text-xs text-muted-foreground">This summary is a starting template. Have it reviewed before you launch publicly.</p>
    </article>
  );
}

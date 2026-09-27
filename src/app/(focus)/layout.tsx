/** Focus mode: no site navigation while a learner is mid-exam. */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}

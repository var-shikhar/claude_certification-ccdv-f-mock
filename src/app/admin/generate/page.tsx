import { KeyRound } from 'lucide-react';
import { ExamSwitcher } from '@/components/admin/exam-switcher';
import { GeneratorPanel } from '@/components/admin/generator-panel';
import { aiEnabled, aiModel } from '@/server/ai/client';
import { examOptions, listExamsForAdmin } from '@/server/admin/questions';

export const metadata = { title: 'AI drafts' };

export default async function AdminGeneratePage({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  const exams = await listExamsForAdmin();
  const { exam: examParam } = await searchParams;
  const exam = exams.find((e) => e.id === examParam) ?? exams[0];
  if (!exam) return <p className="text-muted-foreground">No exams yet.</p>;
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI drafts</h1>
          <p className="text-sm text-muted-foreground">Generate candidate questions for a skill, then review them in the editor. {aiEnabled() ? `Model: ${aiModel()}.` : ''}</p>
        </div>
        <ExamSwitcher exams={examOptions(exams)} value={exam.id} />
      </div>
      {aiEnabled() ? (
        <GeneratorPanel exam={exam.config} />
      ) : (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <KeyRound className="mx-auto size-9 text-primary" />
          <h2 className="mt-3 font-semibold">Connect an AI provider</h2>
          <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
            Add <code>OPENAI_API_KEY</code> to <code>.env</code>. For LiteLLM, also set <code>OPENAI_BASE_URL</code> (your proxy&apos;s <code>/v1</code> URL) and <code>AI_MODEL</code> (a model alias it serves). Restart the server afterwards.
          </p>
        </div>
      )}
    </div>
  );
}

import { ExamSwitcher } from '@/components/admin/exam-switcher';
import { ImportPanel } from '@/components/admin/import-panel';
import { examOptions, listExamsForAdmin } from '@/server/admin/questions';

export const metadata = { title: 'Import & export' };

export default async function AdminImportPage({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  const exams = await listExamsForAdmin();
  const { exam: examParam } = await searchParams;
  const exam = exams.find((e) => e.id === examParam) ?? exams[0];
  if (!exam) return <p className="text-muted-foreground">No exams yet.</p>;
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import &amp; export</h1>
          <p className="text-sm text-muted-foreground">Every item is validated before anything is written.</p>
        </div>
        <ExamSwitcher exams={examOptions(exams)} value={exam.id} />
      </div>
      <ImportPanel examId={exam.id} examCode={exam.code} />
    </div>
  );
}

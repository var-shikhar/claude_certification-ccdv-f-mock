import type { QuestionPool, QuestionStatus } from '@/db/schema';
import { saveQuestionSchema } from '@/lib/validators';
import { listQuestions, saveQuestion, type QuestionDraft } from '@/server/admin/questions';
import { parseBody, route } from '@/server/http';

const STAFF = { roles: ['author', 'admin'] as ('author' | 'admin')[] };

export const GET = route(async ({ req }) => {
  const p = new URL(req.url).searchParams;
  return listQuestions({
    examId: p.get('examId') ?? '',
    status: (p.get('status') as QuestionStatus | 'all' | null) ?? 'all',
    pool: (p.get('pool') as QuestionPool | 'all' | null) ?? 'all',
    type: p.get('type') || undefined,
    skill: p.get('skill') || undefined,
    q: p.get('q') || undefined,
    flagged: p.get('flagged') === '1',
    sort: (p.get('sort') as 'updated' | 'id' | 'p' | 'n' | null) ?? 'updated',
    page: Number(p.get('page') ?? 1) || 1,
  });
}, STAFF);

export const POST = route(async ({ req, user }) => {
  const { examId, draft, note } = await parseBody(req, saveQuestionSchema);
  return saveQuestion(user.id, examId, draft as QuestionDraft, { note });
}, STAFF);

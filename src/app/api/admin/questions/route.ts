import type { QuestionPool, QuestionStatus } from '@/db/schema';
import { saveQuestionSchema } from '@/lib/validators';
import { listQuestionIds, listQuestions, questionStatusCounts, saveQuestion, type QuestionDraft, type QuestionListFilters, type QuestionSort } from '@/server/admin/questions';
import { parseBody, route } from '@/server/http';

const STAFF = { roles: ['author', 'admin'] as ('author' | 'admin')[] };
const STATUSES: (QuestionStatus | 'all')[] = ['all', 'draft', 'review', 'published', 'retired'];
const POOLS: (QuestionPool | 'all')[] = ['all', 'bank', 'imported'];
const SORTS: QuestionSort[] = ['updated', 'id', 'p', 'n'];

const pick = <T extends string>(allowed: readonly T[], value: string | null, fallback: T) =>
  allowed.find((v) => v === value) ?? fallback;

/**
 * GET ?examId=…&status&pool&type&skill&q&flagged&sort&cursor  one page of the question list
 * GET ?examId=…&view=counts                                  questions per status (the tab counts)
 * GET ?examId=…&view=ids&<filters>                           every matching id, for "select all"
 */
export const GET = route(async ({ req }) => {
  const p = new URL(req.url).searchParams;
  const examId = p.get('examId') ?? '';
  if (p.get('view') === 'counts') return questionStatusCounts(examId);
  const filters: QuestionListFilters = {
    examId,
    status: pick(STATUSES, p.get('status'), 'all'),
    pool: pick(POOLS, p.get('pool'), 'all'),
    type: p.get('type') || undefined,
    skill: p.get('skill') || undefined,
    q: p.get('q') || undefined,
    flagged: p.get('flagged') === '1',
    sort: pick(SORTS, p.get('sort'), 'updated'),
  };
  if (p.get('view') === 'ids') return listQuestionIds(filters);
  return listQuestions({ ...filters, cursor: p.get('cursor') });
}, STAFF);

export const POST = route(async ({ req, user }) => {
  const { examId, draft, note } = await parseBody(req, saveQuestionSchema);
  return saveQuestion(user.id, examId, draft as QuestionDraft, { note });
}, STAFF);

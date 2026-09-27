import { saveQuestionSchema } from '@/lib/validators';
import { getQuestionForEditor, saveQuestion, type QuestionDraft } from '@/server/admin/questions';
import { parseBody, route } from '@/server/http';

const STAFF = { roles: ['author', 'admin'] as ('author' | 'admin')[] };

export const GET = route<{ id: string }>(async ({ params }) => getQuestionForEditor(params.id), STAFF);

export const PUT = route<{ id: string }>(async ({ req, user, params }) => {
  const { examId, draft, note } = await parseBody(req, saveQuestionSchema);
  return saveQuestion(user.id, examId, draft as QuestionDraft, { id: params.id, note });
}, STAFF);

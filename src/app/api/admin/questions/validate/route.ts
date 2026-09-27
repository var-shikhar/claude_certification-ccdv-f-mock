import { saveQuestionSchema } from '@/lib/validators';
import { checkDraft, type QuestionDraft } from '@/server/admin/questions';
import { parseBody, route } from '@/server/http';

/** Live validation for the editor: the same rules the seed and importer use. */
export const POST = route(async ({ req }) => {
  const { examId, draft } = await parseBody(req, saveQuestionSchema);
  return checkDraft(examId, draft as QuestionDraft);
}, { roles: ['author', 'admin'] });

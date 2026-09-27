import { checkAnswerSchema } from '@/lib/validators';
import { answerAdaptive } from '@/server/attempts';
import { parseBody, route } from '@/server/http';

export const POST = route<{ id: string }>(async ({ req, user, params }) => {
  const { questionId, response } = await parseBody(req, checkAnswerSchema);
  return answerAdaptive(user.id, params.id, questionId, response);
});

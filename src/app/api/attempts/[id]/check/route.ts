import { checkAnswerSchema } from '@/lib/validators';
import { checkAnswer } from '@/server/attempts';
import { parseBody, route } from '@/server/http';

export const POST = route<{ id: string }>(async ({ req, user, params }) => {
  const { questionId, response } = await parseBody(req, checkAnswerSchema);
  return checkAnswer(user.id, params.id, questionId, response);
});

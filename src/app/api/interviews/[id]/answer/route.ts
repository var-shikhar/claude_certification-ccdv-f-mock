import { interviewAnswerSchema } from '@/lib/validators';
import { answerInterview } from '@/server/ai/interviews';
import { parseBody, route } from '@/server/http';

export const POST = route<{ id: string }>(async ({ req, user, params }) => {
  const { answer } = await parseBody(req, interviewAnswerSchema);
  return answerInterview(user.id, user.role as string, params.id, answer);
});

import { createChallengeSchema } from '@/lib/validators';
import { createChallenge } from '@/server/challenges';
import { parseBody, route } from '@/server/http';

export const POST = route(async ({ req, user }) => {
  const { attemptId } = await parseBody(req, createChallengeSchema);
  return createChallenge(user.id, attemptId);
});

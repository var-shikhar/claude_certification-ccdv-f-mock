import { startAttemptSchema } from '@/lib/validators';
import { startAttempt } from '@/server/attempts';
import { parseBody, route } from '@/server/http';

export const POST = route(async ({ req, user }) => {
  const input = await parseBody(req, startAttemptSchema);
  return startAttempt(user.id, user.isAnonymous ? '' : user.name, input);
});

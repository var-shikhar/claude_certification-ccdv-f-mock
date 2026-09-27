import { bulkStatusSchema } from '@/lib/validators';
import { setQuestionStatus } from '@/server/admin/questions';
import { parseBody, route } from '@/server/http';

export const POST = route(async ({ req, user }) => {
  const { ids, status } = await parseBody(req, bulkStatusSchema);
  return setQuestionStatus(user.id, ids, status);
}, { roles: ['author', 'admin'] });

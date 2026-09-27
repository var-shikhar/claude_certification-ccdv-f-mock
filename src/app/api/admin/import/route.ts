import { importSchema } from '@/lib/validators';
import { commitImport } from '@/server/admin/moderation';
import { parseBody, route } from '@/server/http';

export const POST = route(async ({ req, user }) => {
  const { examId, format, text, setName, pool, status, overwrite } = await parseBody(req, importSchema);
  return commitImport(user.id, examId, format, text, { setName, pool, status, overwrite });
}, { roles: ['author', 'admin'] });

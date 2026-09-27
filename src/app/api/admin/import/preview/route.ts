import { importSchema } from '@/lib/validators';
import { previewImport } from '@/server/admin/moderation';
import { parseBody, route } from '@/server/http';

export const POST = route(async ({ req }) => {
  const { examId, format, text, setName } = await parseBody(req, importSchema);
  return previewImport(examId, format, text, setName);
}, { roles: ['author', 'admin'] });

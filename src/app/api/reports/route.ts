import { reportSchema } from '@/lib/validators';
import { parseBody, route } from '@/server/http';
import { reportQuestion } from '@/server/library';

export const POST = route(async ({ req, user }) => reportQuestion(user.id, await parseBody(req, reportSchema)));

import { generateSchema } from '@/lib/validators';
import { generateQuestions } from '@/server/ai/generator';
import { parseBody, route } from '@/server/http';

export const POST = route(async ({ req, user }) => generateQuestions(user.id, user.role as string, await parseBody(req, generateSchema)), { roles: ['author', 'admin'] });

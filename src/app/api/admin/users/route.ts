import { listUsers } from '@/server/admin/moderation';
import { route } from '@/server/http';

export const GET = route(async ({ req }) => listUsers(new URL(req.url).searchParams.get('q') ?? undefined), { roles: ['admin'] });

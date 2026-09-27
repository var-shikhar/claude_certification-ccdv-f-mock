import { resolveReportsSchema } from '@/lib/validators';
import { listReports, resolveReports } from '@/server/admin/moderation';
import { parseBody, route } from '@/server/http';

const STAFF = { roles: ['author', 'admin'] as ('author' | 'admin')[] };

export const GET = route(async ({ req }) => {
  const status = new URL(req.url).searchParams.get('status');
  return listReports(status === 'resolved' || status === 'dismissed' ? status : 'open');
}, STAFF);

export const POST = route(async ({ req, user }) => {
  const { ids, status, resolution } = await parseBody(req, resolveReportsSchema);
  return resolveReports(user.id, ids, status, resolution);
}, STAFF);

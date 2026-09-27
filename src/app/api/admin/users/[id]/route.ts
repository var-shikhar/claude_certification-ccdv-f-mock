import { setRoleSchema } from '@/lib/validators';
import { setUserRole } from '@/server/admin/moderation';
import { parseBody, route } from '@/server/http';

export const PATCH = route<{ id: string }>(async ({ req, user, params }) => {
  const { role } = await parseBody(req, setRoleSchema);
  return setUserRole(user.id, params.id, role);
}, { roles: ['admin'] });

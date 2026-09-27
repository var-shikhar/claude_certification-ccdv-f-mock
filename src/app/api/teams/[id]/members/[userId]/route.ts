import { memberRoleSchema } from '@/lib/validators';
import { parseBody, route } from '@/server/http';
import { removeMember, setMemberRole } from '@/server/teams';

export const DELETE = route<{ id: string; userId: string }>(async ({ user, params }) => removeMember(user.id, params.id, params.userId));

export const PATCH = route<{ id: string; userId: string }>(async ({ req, user, params }) => {
  const { role } = await parseBody(req, memberRoleSchema);
  return setMemberRole(user.id, params.id, params.userId, role);
});

import { teamJoinSchema } from '@/lib/validators';
import { parseBody, route } from '@/server/http';
import { joinTeam } from '@/server/teams';

export const POST = route(async ({ req, user }) => {
  const { code } = await parseBody(req, teamJoinSchema);
  return joinTeam(user.id, code);
});

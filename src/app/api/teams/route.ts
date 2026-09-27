import { teamCreateSchema } from '@/lib/validators';
import { parseBody, route } from '@/server/http';
import { createTeam, listMyTeams } from '@/server/teams';

export const GET = route(async ({ user }) => listMyTeams(user.id));

export const POST = route(async ({ req, user }) => {
  const { name } = await parseBody(req, teamCreateSchema);
  return createTeam(user.id, name);
});

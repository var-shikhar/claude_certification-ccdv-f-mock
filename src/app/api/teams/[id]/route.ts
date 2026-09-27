import { route } from '@/server/http';
import { getTeam } from '@/server/teams';

export const GET = route<{ id: string }>(async ({ user, params }) => getTeam(user.id, params.id));

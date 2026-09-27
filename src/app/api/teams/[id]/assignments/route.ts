import { assignmentSchema } from '@/lib/validators';
import { parseBody, route } from '@/server/http';
import { createAssignment } from '@/server/teams';

export const POST = route<{ id: string }>(async ({ req, user, params }) => createAssignment(user.id, params.id, await parseBody(req, assignmentSchema)));

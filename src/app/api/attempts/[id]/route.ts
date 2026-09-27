import { progressPatchSchema } from '@/lib/validators';
import { getPlayerState, saveProgress } from '@/server/attempts';
import { parseBody, route } from '@/server/http';

export const GET = route<{ id: string }>(async ({ user, params }) => getPlayerState(user.id, params.id));

export const PATCH = route<{ id: string }>(async ({ req, user, params }) => {
  const patch = await parseBody(req, progressPatchSchema);
  return saveProgress(user.id, params.id, patch);
});

// navigator.sendBeacon can only POST; treat it as a progress save.
export const POST = PATCH;

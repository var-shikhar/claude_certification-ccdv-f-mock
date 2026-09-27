import { abandonAttempt } from '@/server/attempts';
import { route } from '@/server/http';

export const POST = route<{ id: string }>(async ({ user, params }) => abandonAttempt(user.id, params.id));

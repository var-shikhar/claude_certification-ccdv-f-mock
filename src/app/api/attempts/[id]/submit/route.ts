import { submitAttempt } from '@/server/attempts';
import { route } from '@/server/http';

export const POST = route<{ id: string }>(async ({ user, params }) => submitAttempt(user.id, params.id));

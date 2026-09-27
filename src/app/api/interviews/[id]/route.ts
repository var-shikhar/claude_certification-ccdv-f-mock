import { getInterview } from '@/server/ai/interviews';
import { route } from '@/server/http';

export const GET = route<{ id: string }>(async ({ user, params }) => getInterview(user.id, params.id));

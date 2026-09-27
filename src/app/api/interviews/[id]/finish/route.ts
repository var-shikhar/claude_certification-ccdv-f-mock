import { finishInterview } from '@/server/ai/interviews';
import { route } from '@/server/http';

export const POST = route<{ id: string }>(async ({ user, params }) => finishInterview(user.id, user.role as string, params.id));

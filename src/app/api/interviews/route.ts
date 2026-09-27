import { interviewSetupSchema } from '@/lib/validators';
import { listInterviews, startInterview } from '@/server/ai/interviews';
import { parseBody, route } from '@/server/http';

export const GET = route(async ({ user }) => listInterviews(user.id));

export const POST = route(async ({ req, user }) => startInterview(user.id, user.role as string, await parseBody(req, interviewSetupSchema)));

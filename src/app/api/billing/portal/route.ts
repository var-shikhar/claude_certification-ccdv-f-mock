import { createPortal } from '@/server/billing';
import { route } from '@/server/http';

export const POST = route(async ({ req, user }) => createPortal(user.id, new URL(req.url).origin));

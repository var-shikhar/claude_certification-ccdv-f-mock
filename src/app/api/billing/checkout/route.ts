import { createCheckout } from '@/server/billing';
import { route } from '@/server/http';

export const POST = route(async ({ req, user }) => createCheckout(user.id, new URL(req.url).origin));

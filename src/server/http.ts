import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import type { SessionUser } from '@/lib/auth';
import type { Role } from '@/db/schema';
import { AppError } from './errors';
import { getSession } from './session';

interface HandlerContext<P> { req: Request; user: SessionUser; params: P }

/**
 * Wraps a JSON route handler: requires a session (guests count), optionally a
 * role, and turns thrown errors into consistent `{ error, code }` bodies whose
 * messages are safe to show in a toast.
 */
export function route<P = Record<string, never>>(
  handler: (ctx: HandlerContext<P>) => Promise<unknown>,
  opts: { roles?: Role[] } = {},
) {
  return async (req: Request, context: { params: Promise<P> }) => {
    try {
      const session = await getSession();
      if (!session) return NextResponse.json({ error: 'Please sign in first.', code: 'UNAUTHENTICATED' }, { status: 401 });
      if (opts.roles && !opts.roles.includes(session.user.role as Role)) {
        return NextResponse.json({ error: "You don't have access to that.", code: 'FORBIDDEN' }, { status: 403 });
      }
      const params = context?.params ? await context.params : ({} as P);
      const data = await handler({ req, user: session.user, params });
      return NextResponse.json(data ?? { ok: true });
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json({ error: err.message, code: err.code, ...err.data }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json({ error: 'That request was not valid.', code: 'INVALID', issues: err.issues }, { status: 400 });
      }
      console.error('[api]', err);
      return NextResponse.json({ error: 'Something went wrong on our side. Please try again.', code: 'INTERNAL' }, { status: 500 });
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const body = await req.json().catch(() => ({}));
  return schema.parse(body);
}

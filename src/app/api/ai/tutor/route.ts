import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { tutorSchema } from '@/lib/validators';
import { tutorStream } from '@/server/ai/tutor';
import { AppError } from '@/server/errors';
import { getSession } from '@/server/session';

/** Streams the tutor's reply as plain text (not wrapped by `route`, which returns JSON). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Please sign in first.', code: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const input = tutorSchema.parse(await req.json());
    const stream = await tutorStream(session.user, input);
    return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    if (err instanceof ZodError) return NextResponse.json({ error: 'That request was not valid.', code: 'INVALID' }, { status: 400 });
    console.error('[tutor]', err);
    return NextResponse.json({ error: 'Something went wrong on our side. Please try again.' }, { status: 500 });
  }
}

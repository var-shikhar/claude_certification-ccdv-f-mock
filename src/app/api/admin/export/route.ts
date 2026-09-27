import { NextResponse } from 'next/server';
import type { QuestionStatus } from '@/db/schema';
import { exportQuestions } from '@/server/admin/moderation';
import { AppError } from '@/server/errors';
import { getSession } from '@/server/session';

/** Downloads questions in the content JSON format (a file, so it isn't wrapped by `route`). */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !['author', 'admin'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'You do not have access to that.' }, { status: 403 });
  }
  const p = new URL(req.url).searchParams;
  const examId = p.get('examId') ?? '';
  const status = (p.get('status') ?? 'published') as QuestionStatus | 'all';
  try {
    const items = await exportQuestions(examId, status);
    return new NextResponse(JSON.stringify(items, null, 2) + '\n', {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="${examId}-${status}-questions.json"`,
      },
    });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

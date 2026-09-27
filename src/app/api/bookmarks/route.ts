import { bookmarkSchema } from '@/lib/validators';
import { parseBody, route } from '@/server/http';
import { listBookmarks, saveBookmark } from '@/server/library';

export const GET = route(async ({ req, user }) => {
  const examId = new URL(req.url).searchParams.get('examId') ?? undefined;
  return listBookmarks(user.id, examId);
});

export const POST = route(async ({ req, user }) => {
  const { questionId, note } = await parseBody(req, bookmarkSchema);
  return saveBookmark(user.id, questionId, note);
});

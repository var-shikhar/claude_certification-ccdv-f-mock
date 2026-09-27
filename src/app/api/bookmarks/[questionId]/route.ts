import { route } from '@/server/http';
import { removeBookmark } from '@/server/library';

export const DELETE = route<{ questionId: string }>(async ({ user, params }) => removeBookmark(user.id, params.questionId));

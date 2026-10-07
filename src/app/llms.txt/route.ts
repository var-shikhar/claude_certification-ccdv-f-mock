import { buildLlmsTxt } from '@/lib/llms-txt';
import { getExam, getStudyNotes, listExams } from '@/server/exams';

// Built on request from the cached catalogue (deploys never need the database during the build);
// the CDN keeps a copy for an hour.
export const dynamic = 'force-dynamic';

export async function GET() {
  const exams = await listExams();
  const full = await Promise.all(exams.map(async (e) => {
    const [ex, notes] = await Promise.all([getExam(e.id), getStudyNotes(e.id)]);
    return ex ? { ...e, config: ex.config, notes } : null;
  }));
  return new Response(buildLlmsTxt(full.filter((e) => e !== null)), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

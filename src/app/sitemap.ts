import type { MetadataRoute } from 'next';
import { listExams, getStudyNotes } from '@/server/exams';

// Rendered on request (not at build time), so deploys never need the database during the build.
export const dynamic = 'force-dynamic';

const base = () => (process.env.BETTER_AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = base();
  const staticPages = ['', '/explore', '/interviews', '/pricing', '/verify', '/about/scoring', '/about/privacy', '/about/terms'];
  const pages: MetadataRoute.Sitemap = staticPages.map((p) => ({ url: `${url}${p}`, changeFrequency: 'weekly', priority: p === '' ? 1 : 0.6 }));
  try {
    const exams = await listExams();
    const studyPages = (await Promise.all(exams.map(async (e) => Object.keys(await getStudyNotes(e.id)).map((skill) => `/exams/${e.id}/study/${skill}`)))).flat();
    pages.push(
      ...exams.map((e) => ({ url: `${url}/exams/${e.id}`, changeFrequency: 'weekly' as const, priority: 0.9 })),
      ...studyPages.map((p) => ({ url: `${url}${p}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
    );
  } catch (err) {
    console.error('[sitemap] could not list exams', err);
  }
  return pages;
}

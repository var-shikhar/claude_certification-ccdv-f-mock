import type { MetadataRoute } from 'next';
import { listExams, getStudyNotes } from '@/server/exams';

const base = () => (process.env.BETTER_AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = base();
  const exams = await listExams();
  const staticPages = ['', '/explore', '/interviews', '/pricing', '/verify', '/about/scoring', '/about/privacy', '/about/terms'];
  const studyPages = (await Promise.all(exams.map(async (e) => Object.keys(await getStudyNotes(e.id)).map((skill) => `/exams/${e.id}/study/${skill}`)))).flat();
  return [
    ...staticPages.map((p) => ({ url: `${url}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.6 })),
    ...exams.map((e) => ({ url: `${url}/exams/${e.id}`, changeFrequency: 'weekly' as const, priority: 0.9 })),
    ...studyPages.map((p) => ({ url: `${url}${p}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
  ];
}

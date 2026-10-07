import type { MetadataRoute } from 'next';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { exam, studyNote } from '@/db/schema';
import { siteUrl } from '@/lib/site';

// Rendered on request (not at build time), so deploys never need the database during the build.
export const dynamic = 'force-dynamic';

const STATIC_PAGES = ['/', '/explore', '/interviews', '/pricing', '/verify', '/about/scoring', '/about/privacy', '/about/terms'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({ url: siteUrl(p), changeFrequency: 'weekly', priority: p === '/' ? 1 : 0.6 }));
  try {
    // Real modification dates let crawlers revisit only what changed.
    const [exams, notes] = await Promise.all([
      db.select({ id: exam.id, updatedAt: exam.updatedAt }).from(exam).where(eq(exam.isPublished, true)),
      db.select({ examId: studyNote.examId, skillId: studyNote.skillId, updatedAt: studyNote.updatedAt })
        .from(studyNote).innerJoin(exam, and(eq(exam.id, studyNote.examId), eq(exam.isPublished, true))),
    ]);
    pages.push(
      ...exams.map((e) => ({ url: siteUrl(`/exams/${e.id}`), lastModified: e.updatedAt, changeFrequency: 'weekly' as const, priority: 0.9 })),
      ...notes.map((n) => ({ url: siteUrl(`/exams/${n.examId}/study/${n.skillId}`), lastModified: n.updatedAt, changeFrequency: 'monthly' as const, priority: 0.5 })),
    );
  } catch (err) {
    console.error('[sitemap] could not list exams', err);
  }
  return pages;
}

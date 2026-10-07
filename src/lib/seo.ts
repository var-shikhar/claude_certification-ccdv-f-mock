// Titles, descriptions and schema.org structured data (JSON-LD) for public pages.
// Structured data tells search and AI answer engines what a page is (a course, its
// syllabus, its FAQ) instead of leaving them to guess from the markup.

import type { ExamConfig } from '@/lib/engine/types';
import { SITE_NAME, siteUrl } from './site';

type Ld = Record<string, unknown>;

interface ExamLike {
  id: string;
  code: string;
  title: string;
  vendor: string | null;
  category: string;
  meta: { tagline?: string; description?: string };
}

/** What people search for first: the code for certifications, the subject for interview prep. */
export function examPageTitle(ex: Pick<ExamLike, 'code' | 'title' | 'category'>) {
  return ex.category === 'certification' ? `${ex.code} practice exam: ${ex.title}` : `${ex.title}: practice questions with explanations`;
}

/** Up to about 160 characters, cut at a word boundary. */
export function clip(text: string, max = 160) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).replace(/[\s,.;:–-]+$/, '')}…`;
}

export function examDescription(ex: ExamLike & { config: Pick<ExamConfig, 'itemCount' | 'timeLimitMinutes'> }) {
  return clip(ex.meta.description ?? ex.meta.tagline
    ?? `${ex.code} mocks with ${ex.config.itemCount} questions in ${ex.config.timeLimitMinutes} minutes, explanations for every option and a readiness score.`);
}

/** One JSON-LD document holding several linked nodes. */
export const graph = (...nodes: Ld[]): Ld => ({ '@context': 'https://schema.org', '@graph': nodes });

export const organizationLd = (): Ld => ({
  '@type': 'Organization',
  '@id': siteUrl('/#organization'),
  name: SITE_NAME,
  url: siteUrl('/'),
  logo: siteUrl('/apple-icon.png'),
});

export const websiteLd = (): Ld => ({
  '@type': 'WebSite',
  '@id': siteUrl('/#website'),
  name: SITE_NAME,
  url: siteUrl('/'),
  inLanguage: 'en',
  publisher: { '@id': siteUrl('/#organization') },
});

export function breadcrumbLd(items: { name: string; path: string }[]): Ld {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: siteUrl(it.path) })),
  };
}

export function faqLd(faqs: { q: string; a: string }[]): Ld {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function courseLd(ex: ExamLike & { isFree: boolean; config: ExamConfig }): Ld {
  const officialUrl = ex.category === 'certification' ? ex.config.officialUrl : undefined;
  return {
    '@type': 'Course',
    '@id': siteUrl(`/exams/${ex.id}#course`),
    name: examPageTitle(ex),
    description: examDescription(ex),
    url: siteUrl(`/exams/${ex.id}`),
    courseCode: ex.code,
    inLanguage: 'en',
    educationalUse: 'assessment',
    isAccessibleForFree: ex.isFree,
    provider: { '@id': siteUrl('/#organization') },
    teaches: ex.config.skills.map((s) => s.name),
    // Ties the mock to the real credential it prepares for.
    ...(officialUrl ? {
      about: {
        '@type': 'EducationalOccupationalCredential',
        name: ex.title,
        credentialCategory: 'certification',
        url: officialUrl,
        ...(ex.vendor ? { recognizedBy: { '@type': 'Organization', name: ex.vendor } } : {}),
      },
    } : {}),
  };
}

export function studyNoteLd(ex: Pick<ExamLike, 'id' | 'code'>, skill: { id: string; name: string }, summary: string): Ld {
  const path = `/exams/${ex.id}/study/${skill.id}`;
  return {
    '@type': 'LearningResource',
    '@id': siteUrl(`${path}#notes`),
    name: `${skill.name}: ${ex.code} study notes`,
    description: clip(summary),
    url: siteUrl(path),
    learningResourceType: 'Study notes',
    educationalUse: 'self-study',
    inLanguage: 'en',
    about: skill.name,
    isPartOf: { '@id': siteUrl(`/exams/${ex.id}#course`) },
    publisher: { '@id': siteUrl('/#organization') },
  };
}

export function examListLd(exams: Pick<ExamLike, 'id' | 'code' | 'title' | 'category'>[]): Ld {
  return {
    '@type': 'ItemList',
    name: `Practice exams on ${SITE_NAME}`,
    itemListElement: exams.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: siteUrl(`/exams/${e.id}`), name: examPageTitle(e) })),
  };
}

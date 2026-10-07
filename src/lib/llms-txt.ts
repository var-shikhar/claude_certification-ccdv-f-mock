// /llms.txt (https://llmstxt.org): a plain Markdown map of the site for AI tools
// and answer engines, built from the live catalogue so it never goes stale.

import type { StudyNote } from '@/db/schema';
import type { ExamConfig } from '@/lib/engine/types';
import { clip, examPageTitle } from './seo';
import { SITE_NAME, siteUrl } from './site';

export interface LlmsExam {
  id: string;
  code: string;
  title: string;
  category: string;
  meta: { tagline?: string };
  config: Pick<ExamConfig, 'itemCount' | 'timeLimitMinutes' | 'scale' | 'domains' | 'skills'>;
  notes: Record<string, StudyNote>;
  /** how many questions the public sample page shows (0 hides the link) */
  samples: number;
}

const SECTIONS: [category: string, heading: string][] = [
  ['certification', 'Certification practice exams'],
  ['interview', 'Interview prep'],
  ['quiz', 'Quizzes'],
];

const n = (v: number) => v.toLocaleString('en-US');

function format(e: LlmsExam) {
  const { itemCount, timeLimitMinutes, scale, domains } = e.config;
  const facts = `${itemCount} questions in ${timeLimitMinutes} minutes, scored ${n(scale.min)}–${n(scale.max)} with ${n(scale.passing)} to pass, across ${domains.length} domain${domains.length === 1 ? '' : 's'}: ${domains.map((d) => `${d.name} (${d.weight}%)`).join(', ')}.`;
  return e.meta.tagline ? `${facts} ${e.meta.tagline}` : facts;
}

export function buildLlmsTxt(exams: LlmsExam[]): string {
  const out: string[] = [
    `# ${SITE_NAME}`,
    '',
    '> Mock exams, quizzes and interview practice in one place: timed certification mocks that follow each exam\'s official blueprint, drills that explain every option, a readiness score that predicts your result, and AI mock interviews with rubric feedback.',
    '',
    `${SITE_NAME} is an independent practice platform. It is not affiliated with any exam vendor, and its readiness certificates are not official credentials. Every exam page offers a free 15-question diagnostic; drills reveal the answer and an explanation after each question.`,
    '',
  ];

  const known = new Set(SECTIONS.map(([c]) => c));
  const sections: [string, LlmsExam[]][] = [
    ...SECTIONS.map(([c, heading]): [string, LlmsExam[]] => [heading, exams.filter((e) => e.category === c)]),
    ['Other practice', exams.filter((e) => !known.has(e.category))],
  ];
  for (const [heading, group] of sections) {
    if (!group.length) continue;
    out.push(`## ${heading}`, '');
    for (const e of group) {
      out.push(`- [${examPageTitle(e)}](${siteUrl(`/exams/${e.id}`)}): ${format(e)}`);
      if (e.samples) out.push(`  - [${e.samples} sample questions with answers and explanations](${siteUrl(`/exams/${e.id}/sample-questions`)})`);
    }
    out.push('');
  }

  const withNotes = exams.filter((e) => Object.keys(e.notes).length);
  if (withNotes.length) {
    out.push('## Study notes', '');
    for (const e of withNotes) {
      out.push(`### ${e.code}: ${e.title}`, '');
      for (const s of e.config.skills) {
        const note = e.notes[s.id];
        if (note) out.push(`- [${s.name}](${siteUrl(`/exams/${e.id}/study/${s.id}`)}): ${clip(note.summary, 220)}`);
      }
      out.push('');
    }
  }

  out.push(
    '## About',
    '',
    `- [How scoring works](${siteUrl('/about/scoring')}): how mocks are scored like certification exams, and how the readiness and predicted scores are worked out.`,
    `- [AI mock interviews](${siteUrl('/interviews')}): an AI interviewer that asks follow-ups and scores answers against a rubric.`,
    `- [Pricing](${siteUrl('/pricing')})`,
    `- [Verify a certificate](${siteUrl('/verify')})`,
    `- [Privacy](${siteUrl('/about/privacy')})`,
    `- [Terms](${siteUrl('/about/terms')})`,
    '',
  );
  return out.join('\n');
}

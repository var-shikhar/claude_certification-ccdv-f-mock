import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';
import { JsonLd } from '@/components/seo/json-ld';
import { loadExamBundle } from '@/lib/content/load';
import { examFaq } from '@/lib/exam-faq';
import { buildLlmsTxt } from '@/lib/llms-txt';
import { clip, courseLd, examPageTitle } from '@/lib/seo';
import { DEFAULT_SITE_URL, siteUrl } from '@/lib/site';

const original = process.env.SITE_URL;
afterEach(() => {
  if (original === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = original;
});

const cert = loadExamBundle('ccdv-f');
const interview = loadExamBundle('javascript');
const asExam = (b: ReturnType<typeof loadExamBundle>) => ({
  id: b.config.id, code: b.config.code, title: b.config.title, vendor: b.vendor, category: b.category, meta: b.meta, isFree: true, config: b.config,
});

describe('siteUrl', () => {
  test('defaults to the Vercel address', () => {
    delete process.env.SITE_URL;
    expect(siteUrl()).toBe(DEFAULT_SITE_URL);
    expect(siteUrl('/exams/ccdv-f')).toBe('https://quizzmonkey.vercel.app/exams/ccdv-f');
  });
  test('follows SITE_URL, with or without a scheme or trailing slash', () => {
    process.env.SITE_URL = 'quizzmonkey.com/';
    expect(siteUrl()).toBe('https://quizzmonkey.com');
    expect(siteUrl('llms.txt')).toBe('https://quizzmonkey.com/llms.txt');
    process.env.SITE_URL = 'http://localhost:3000';
    expect(siteUrl('/')).toBe('http://localhost:3000/');
  });
});

describe('structured data', () => {
  test('text from the database cannot close the script element', () => {
    const html = renderToStaticMarkup(createElement(JsonLd, { data: { name: '</script><script>alert(1)</script>' } }));
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(JSON.parse(html.replace(/^<script[^>]*>|<\/script>$/g, '')).name).toBe('</script><script>alert(1)</script>');
  });

  test('certifications link to the real credential; interview mocks do not', () => {
    const ld = courseLd(asExam(cert));
    expect(ld).toMatchObject({ '@type': 'Course', courseCode: 'CCDV-F', url: `${DEFAULT_SITE_URL}/exams/ccdv-f` });
    expect(ld.about).toMatchObject({ '@type': 'EducationalOccupationalCredential', url: cert.config.officialUrl });
    expect(courseLd(asExam(interview)).about).toBeUndefined();
  });

  test('titles lead with what people search for, and descriptions stay short', () => {
    expect(examPageTitle(asExam(cert))).toBe('CCDV-F practice exam: Claude Certified Developer – Foundations');
    expect(examPageTitle(asExam(interview))).toBe('JavaScript Interview Mock: practice questions with explanations');
    const long = 'word '.repeat(80);
    expect(clip(long).length).toBeLessThanOrEqual(160);
    expect(clip(long).endsWith('…')).toBe(true);
    expect(clip('Short enough.')).toBe('Short enough.');
  });
});

describe('exam FAQ', () => {
  test('numbers come from the exam itself', () => {
    const faq = examFaq(asExam(cert));
    const text = faq.map((f) => `${f.q} ${f.a}`).join('\n');
    expect(text).toContain(`${cert.config.itemCount} questions in ${cert.config.timeLimitMinutes} minutes`);
    expect(text).toContain(`${cert.config.scale.passing} is the passing score`);
    for (const d of cert.config.domains) expect(text).toContain(`${d.name} (${d.weight}%)`);
    expect(faq.at(-1)?.q).toBe('Is this the official CCDV-F exam?');
  });

  test('interview mocks skip the "official exam" question', () => {
    expect(examFaq(asExam(interview)).some((f) => f.q.includes('official'))).toBe(false);
  });
});

describe('llms.txt', () => {
  test('lists every exam under its category and links study notes', () => {
    const txt = buildLlmsTxt([
      { ...asExam(cert), notes: cert.study },
      { ...asExam(interview), notes: {} },
    ]);
    expect(txt.startsWith('# quizzMonkey\n\n> ')).toBe(true);
    expect(txt).toContain(`## Certification practice exams\n\n- [CCDV-F practice exam: Claude Certified Developer – Foundations](${DEFAULT_SITE_URL}/exams/ccdv-f)`);
    expect(txt).toContain('## Interview prep');
    for (const skillId of Object.keys(cert.study)) expect(txt).toContain(`${DEFAULT_SITE_URL}/exams/ccdv-f/study/${skillId})`);
  });
});

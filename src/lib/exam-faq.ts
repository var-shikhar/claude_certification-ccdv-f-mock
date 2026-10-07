// Frequently asked questions for an exam page, built from the exam's own
// configuration so every number matches the mocks learners actually take. They
// are shown on the page and published as FAQPage structured data.

import type { ExamConfig } from '@/lib/engine/types';

export interface FaqEntry {
  q: string;
  a: string;
  link?: { href: string; label: string };
}

interface FaqExam {
  code: string;
  title: string;
  vendor: string | null;
  category: string;
  config: Pick<ExamConfig, 'itemCount' | 'timeLimitMinutes' | 'scale' | 'domains' | 'officialUrl'>;
}

const list = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

export function examFaq(ex: FaqExam): FaqEntry[] {
  const { itemCount, timeLimitMinutes, scale, domains } = ex.config;
  const certification = ex.category === 'certification';
  const name = certification ? `the ${ex.code} practice exam` : `a full ${ex.title}`;
  const faqs: FaqEntry[] = [
    {
      q: `How many questions are in ${name}, and how long is it?`,
      a: `${itemCount} questions in ${timeLimitMinutes} minutes. Each mock draws questions from every domain in proportion to its weight, so the mix matches the blueprint.`,
    },
    {
      q: `What score do you need to pass ${certification ? ex.code : 'it'}?`,
      a: `Results are reported from ${scale.min.toLocaleString('en-US')} to ${scale.max.toLocaleString('en-US')}, and ${scale.passing.toLocaleString('en-US')} is the passing score used in these mocks. Harder questions carry more weight.`,
    },
    {
      q: `What does ${certification ? `the ${ex.code} exam` : `the ${ex.title}`} cover?`,
      a: `${domains.length} domain${domains.length === 1 ? '' : 's'}: ${list(domains.map((d) => `${d.name} (${d.weight}%)`))}.`,
    },
    {
      q: 'How can I practise for it?',
      a: 'Start with the free 15-question diagnostic to find your weak spots, drill any skill with an explanation after every answer, retry your mistakes with spaced review, then sit timed full mocks.',
    },
    {
      q: 'How is my readiness score worked out?',
      a: 'It weighs your recent answers on each skill by difficulty, combines the skills by their exam weight into a predicted score, and reports your chance of reaching the pass mark.',
      link: { href: '/about/scoring', label: 'How scoring works' },
    },
  ];
  if (certification) {
    faqs.push({
      q: `Is this the official ${ex.code} exam?`,
      a: `No. quizzMonkey is an independent practice platform${ex.vendor ? ` and isn't affiliated with ${ex.vendor}` : ''}. Practise here, then book the real exam with the vendor. Readiness certificates are not official credentials.`,
      ...(ex.config.officialUrl ? { link: { href: ex.config.officialUrl, label: 'Official exam page' } } : {}),
    });
  }
  return faqs;
}

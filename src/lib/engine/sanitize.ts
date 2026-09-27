// What the browser may see of a question.
//
// During an attempt the client gets the stem and options in delivery order,
// never the key, rationales or explanation. Keys are revealed per item
// (instant-feedback drills) or all at once after submission.

import type { Question, QuestionType } from './types';

export interface PublicOption { id: string; text: string }
export interface PublicPrompt { id: string; text: string }

export interface PublicQuestion {
  id: string;
  domain: number;
  skill: string;
  difficulty: number;
  type: QuestionType;
  select: number;
  stem: string;
  options: PublicOption[];
  prompts?: PublicPrompt[];
  caseId?: string | null;
}

export interface RevealedQuestion extends PublicQuestion {
  options: (PublicOption & { correct: boolean; why: string })[];
  prompts?: (PublicPrompt & { answer: string })[];
  answerOrder?: string[];
  accepted?: string[];
  explanation: string;
  reference?: string | null;
}

function ordered<T extends { id: string }>(items: T[], order?: string[]): T[] {
  if (!order?.length) return items;
  const byId = new Map(items.map((o) => [o.id, o]));
  return order.map((id) => byId.get(id)).filter((o): o is T => Boolean(o));
}

export function toPublicQuestion(q: Question, optionOrder?: string[]): PublicQuestion {
  return {
    id: q.id,
    domain: q.domain,
    skill: q.skill,
    difficulty: q.difficulty,
    type: q.type,
    select: q.select,
    stem: q.stem,
    options: ordered(q.options, optionOrder).map(({ id, text }) => ({ id, text })),
    prompts: q.prompts?.map(({ id, text }) => ({ id, text })),
    caseId: q.caseId ?? null,
  };
}

export function toRevealedQuestion(q: Question, optionOrder?: string[]): RevealedQuestion {
  return {
    ...toPublicQuestion(q, optionOrder),
    options: ordered(q.options, optionOrder).map((o) => ({ id: o.id, text: o.text, correct: Boolean(o.correct), why: o.why ?? '' })),
    prompts: q.prompts?.map((p) => ({ ...p })),
    answerOrder: q.answerOrder,
    accepted: q.accepted,
    explanation: q.explanation,
    reference: q.reference ?? null,
  };
}

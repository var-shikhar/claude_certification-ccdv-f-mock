// The editable shape of a question in the admin editor, shared by server pages and the client editor.

import type { QuestionType } from '@/lib/engine/types';

export type Status = 'draft' | 'review' | 'published' | 'retired';
export interface Option { id: string; text: string; correct?: boolean; why?: string }
export interface Prompt { id: string; text: string; answer: string }

export interface Draft {
  id: string;
  skill: string;
  difficulty: 1 | 2 | 3 | 4;
  type: QuestionType;
  select: number;
  stem: string;
  options: Option[];
  answerOrder?: string[];
  prompts?: Prompt[];
  accepted?: string[];
  explanation: string;
  reference: string;
  caseId: string;
  status: Status;
  pool: 'bank' | 'imported';
}

export const blank = (id: string): Option => ({ id, text: '', correct: false, why: '' });

export function emptyDraft(skill: string): Draft {
  return {
    id: '', skill, difficulty: 2, type: 'single', select: 1, stem: '',
    options: ['A', 'B', 'C', 'D'].map(blank), explanation: '', reference: '', caseId: '', status: 'draft', pool: 'bank',
  };
}

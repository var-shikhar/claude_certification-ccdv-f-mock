// One source of truth for how each way of practising is named and described,
// so the same words appear on the exam hub, the dashboard, the player and
// the results. Consistent naming is most of what keeps many modes from
// feeling confusing.

import type { AttemptKind } from '@/db/schema';

export interface KindInfo {
  label: string;
  /** one line: when to use this mode */
  when: string;
  /** feedback arrives after each item (drills) or at the end (mocks) */
  feedback: 'instant' | 'end';
  scored: boolean;
}

export const KINDS: Record<AttemptKind, KindInfo> = {
  full: { label: 'Full mock exam', when: 'The real thing: exam length, exam timer, scored at the end.', feedback: 'end', scored: true },
  quick: { label: 'Quick mock', when: 'A shorter timed sitting when you only have 45 minutes.', feedback: 'end', scored: true },
  practice: { label: 'Practice drill', when: 'Learn as you go: see the answer and explanation after each question.', feedback: 'instant', scored: false },
  mistakes: { label: 'Retry mistakes', when: 'Only the questions you most recently got wrong.', feedback: 'instant', scored: false },
  review: { label: 'Daily review', when: 'Spaced-repetition questions that are due today.', feedback: 'instant', scored: false },
  saved: { label: 'Saved questions', when: 'The questions you bookmarked, with answers as you go.', feedback: 'instant', scored: false },
  diagnostic: { label: 'Diagnostic', when: '15 questions across the whole syllabus to find your starting point.', feedback: 'end', scored: true },
  adaptive: { label: 'Adaptive test', when: 'Questions get harder or easier based on how you answer.', feedback: 'end', scored: true },
  challenge: { label: 'Challenge', when: 'A shared question set to compare scores with friends.', feedback: 'end', scored: true },
  assignment: { label: 'Assignment', when: 'Set by your instructor.', feedback: 'end', scored: true },
};

export const isMockKind = (kind: AttemptKind) => KINDS[kind].scored;

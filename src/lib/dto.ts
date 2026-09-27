// Shapes the server hands to client components (JSON-safe: dates are ISO strings).

import type { AttemptKind, AttemptStatus, AttemptSummary } from '@/db/schema';
import type { PublicQuestion, RevealedQuestion } from '@/lib/engine/sanitize';

export interface PlayerItem extends PublicQuestion {
  skillName: string;
  domainName: string;
}

export type RevealedItem = RevealedQuestion & { correct: boolean };

export interface PlayerState {
  id: string;
  examId: string;
  examCode: string;
  examTitle: string;
  kind: AttemptKind;
  difficulty: string;
  difficultyLabel: string;
  instant: boolean;
  status: AttemptStatus;
  current: number;
  responses: Record<string, string[]>;
  flags: Record<string, boolean>;
  checked: Record<string, boolean>;
  timeSpent: Record<string, number>;
  startedAt: string;
  deadline: string | null;
  serverNow: string;
  items: PlayerItem[];
  revealed: Record<string, RevealedItem>;
  cases: Record<string, { title: string; scenario: string }>;
  bookmarks: string[];
  /** AI tutor available for revealed items */
  aiTutor: boolean;
  /** adaptive tests only */
  adaptive?: { target: number };
}

export interface ProgressPatch {
  responses?: Record<string, string[]>;
  flags?: Record<string, boolean>;
  timeSpent?: Record<string, number>;
  current?: number;
}

export interface ResultItem extends RevealedQuestion {
  selected: string[];
  correct: boolean;
  answered: boolean;
  flagged: boolean;
  timeMs: number;
  skillName: string;
  domainName: string;
  bookmarked: boolean;
}

export interface ResultState {
  id: string;
  examId: string;
  examCode: string;
  examTitle: string;
  kind: AttemptKind;
  difficulty: string;
  difficultyLabel: string;
  startedAt: string;
  finishedAt: string | null;
  summary: AttemptSummary;
  scale: { min: number; max: number; passing: number };
  certificateId: string | null;
  certificateEligibleMode: boolean;
  aiTutor: boolean;
  items: ResultItem[];
}

export interface AttemptListItem {
  id: string;
  examId: string;
  examCode: string;
  kind: AttemptKind;
  difficulty: string;
  status: AttemptStatus;
  startedAt: string;
  finishedAt: string | null;
  scaled: number | null;
  passed: boolean | null;
  correctCount: number | null;
  itemCount: number;
  answered: number;
}

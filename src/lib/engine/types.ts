// Shared types for exams and questions. Everything exam-specific (domains,
// skills and their weights, timing, scale, difficulty modes) is data; the
// engine only interprets it.

export type Difficulty = 1 | 2 | 3 | 4;

/**
 * single     multiple choice, one key
 * multi      multiple response, `select` keys, no partial credit
 * truefalse  two fixed options (True / False)
 * order      put the options in the right sequence (`answerOrder`)
 * match      pair each prompt with one option (`prompts[].answer`)
 * fill       type the answer; graded against `accepted`
 */
export type QuestionType = 'single' | 'multi' | 'truefalse' | 'order' | 'match' | 'fill';

export interface QuestionOption {
  id: string;
  text: string;
  correct?: boolean;
  why?: string;
}

export interface MatchPrompt {
  id: string;
  text: string;
  /** id of the option this prompt pairs with */
  answer: string;
}

export interface Question {
  id: string;
  domain: number;
  skill: string;
  difficulty: Difficulty;
  type: QuestionType;
  select: number;
  stem: string;
  options: QuestionOption[];
  explanation: string;
  reference?: string | null;
  /** order: option ids in the correct sequence */
  answerOrder?: string[];
  /** match: left-hand prompts, each keyed to an option */
  prompts?: MatchPrompt[];
  /** fill: accepted answers, compared case- and whitespace-insensitively */
  accepted?: string[];
  /** questions sharing a case study show its scenario above the stem */
  caseId?: string | null;
}

export interface Domain { id: number; name: string; weight: number }
export interface Skill { id: string; domain: number; name: string; weight: number }

export interface DifficultyLevel { label: string; weight: number }

export interface DifficultyMode {
  label: string;
  blurb: string;
  mix: Partial<Record<'1' | '2' | '3' | '4', number>>;
  timeFactor: number;
  certificate: boolean;
}

export interface ExamModeConfig {
  label: string;
  items: number;
  minutes: number;
  certificate: boolean;
}

export interface ExamScale {
  min: number;
  max: number;
  passing: number;
  /** weighted proportion correct that maps exactly onto `passing` */
  cutRaw: number;
}

/** The blueprint and rules of one exam (content/exams/<id>/exam.json minus file lists). */
export interface ExamConfig {
  id: string;
  code: string;
  title: string;
  vendor?: string;
  blueprintVersion?: string;
  officialUrl?: string;
  itemCount: number;
  timeLimitMinutes: number;
  scale: ExamScale;
  domains: Domain[];
  skills: Skill[];
  difficultyLevels: Record<string, DifficultyLevel>;
  difficultyModes: Record<string, DifficultyMode>;
  defaultDifficultyMode: string;
  modes: Record<string, ExamModeConfig>;
}

/** A learner's answer to one item. See `normalizeResponse` for the per-type shape. */
export type Response = string[];
export type Responses = Record<string, Response>;

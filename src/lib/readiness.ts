// Readiness model (pure; the server feeds it answer history).
//
// Skill mastery is the learner's recency-weighted accuracy on that skill:
// recent answers count more than old ones (decay per position), harder
// items count more, and every skill starts from a 50% prior worth PRIOR
// answers so two lucky guesses don't read as mastery. The blueprint weights
// combine skills into a predicted weighted score, which maps onto the exam
// scale. Pass likelihood is a logistic curve around the cut, flatter when
// we've seen little of the learner.

import { levelWeight, toScaled, type ExamConfig } from '@/lib/engine';

export interface AnswerRecord { skill: string; difficulty: number; correct: boolean }

export type MasteryLevel = 'new' | 'weak' | 'fair' | 'strong';
export type Confidence = 'none' | 'low' | 'medium' | 'high';

export interface SkillMastery {
  skillId: string;
  name: string;
  domain: number;
  weight: number;
  answered: number;
  /** smoothed accuracy 0..1 */
  mastery: number;
  level: MasteryLevel;
}

export interface Readiness {
  answered: number;
  skills: SkillMastery[];
  predictedRaw: number | null;
  predictedScaled: number | null;
  passProbability: number | null;
  /** 0..100, what we show as "readiness" */
  readiness: number | null;
  confidence: Confidence;
  /** fraction of skills with at least 3 answers */
  coverage: number;
}

const RECENT_PER_SKILL = 25;
const DECAY = 0.9;
const PRIOR = 2;

export function levelFor(answered: number, mastery: number): MasteryLevel {
  if (answered === 0) return 'new';
  if (mastery >= 0.8) return 'strong';
  if (mastery >= 0.6) return 'fair';
  return 'weak';
}

/** `history` must be newest first. */
export function computeReadiness(exam: ExamConfig, history: AnswerRecord[]): Readiness {
  const bySkill = new Map<string, AnswerRecord[]>();
  for (const a of history) {
    const list = bySkill.get(a.skill) ?? [];
    if (list.length < RECENT_PER_SKILL) list.push(a);
    bySkill.set(a.skill, list);
  }

  const skills: SkillMastery[] = exam.skills.map((s) => {
    const answers = bySkill.get(s.id) ?? [];
    let num = 0.5 * PRIOR;
    let den = PRIOR;
    answers.forEach((a, i) => {
      const w = DECAY ** i * levelWeight(exam, a.difficulty);
      num += w * (a.correct ? 1 : 0);
      den += w;
    });
    const mastery = num / den;
    return { skillId: s.id, name: s.name, domain: s.domain, weight: s.weight, answered: answers.length, mastery, level: levelFor(answers.length, mastery) };
  });

  const answered = history.length;
  const coverage = skills.filter((s) => s.answered >= 3).length / Math.max(1, skills.length);
  if (!answered) {
    return { answered, skills, predictedRaw: null, predictedScaled: null, passProbability: null, readiness: null, confidence: 'none', coverage };
  }

  const totalWeight = skills.reduce((a, s) => a + s.weight, 0) || 1;
  const predictedRaw = skills.reduce((a, s) => a + s.weight * s.mastery, 0) / totalWeight;
  const confidence: Confidence = answered < 30 || coverage < 0.5 ? 'low' : answered < 120 || coverage < 0.85 ? 'medium' : 'high';
  const spread = { low: 0.14, medium: 0.09, high: 0.06, none: 0.2 }[confidence];
  const passProbability = 1 / (1 + Math.exp(-(predictedRaw - exam.scale.cutRaw) / (spread / 2)));

  return {
    answered,
    skills,
    predictedRaw,
    predictedScaled: toScaled(exam, predictedRaw),
    passProbability,
    readiness: Math.round(passProbability * 100),
    confidence,
    coverage,
  };
}

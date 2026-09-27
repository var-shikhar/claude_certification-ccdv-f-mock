// Seven-day study plan, computed from where the learner is (pure; the
// server feeds it readiness and dates, the UI renders it).
//
// Priorities: clear spaced reviews first, then drill the skills with the
// most points to gain (blueprint weight × distance from mastery), check in
// with a timed quick mock every few days, and taper into a full mock and a
// light final day as the exam date approaches.

import type { SkillMastery } from './readiness';

export type PlanTaskKind = 'diagnostic' | 'review' | 'drill' | 'quick' | 'full' | 'rest';

export interface PlanTask {
  kind: PlanTaskKind;
  label: string;
  detail: string;
  minutes: number;
  skillId?: string;
  count?: number;
}

export interface PlanDay { date: string; tasks: PlanTask[] }

export interface PlanInput {
  today: string;
  targetDate: string | null;
  skills: SkillMastery[];
  answered: number;
  due: number;
  dailyGoal: number;
  secondsPerItem: number;
  quickItems: number;
  quickMinutes: number;
  fullMinutes: number;
}

const addDays = (day: string, n: number) => {
  const t = new Date(`${day}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000);

/** Skills ordered by expected gain: weight × (1 − mastery), with unpractised skills treated as 50%. */
export function prioritiseSkills(skills: SkillMastery[]) {
  return [...skills].sort((a, b) => b.weight * (1 - (b.answered ? b.mastery : 0.5)) - a.weight * (1 - (a.answered ? a.mastery : 0.5)));
}

export function buildPlan(input: PlanInput, days = 7): PlanDay[] {
  const order = prioritiseSkills(input.skills);
  const drillSize = Math.max(5, Math.min(20, input.dailyGoal));
  const drillMinutes = Math.max(5, Math.round((drillSize * input.secondsPerItem) / 60));
  const untilExam = input.targetDate ? daysBetween(input.today, input.targetDate) : null;
  const plan: PlanDay[] = [];
  let skillCursor = 0;

  for (let i = 0; i < days; i++) {
    const date = addDays(input.today, i);
    const left = untilExam == null ? null : untilExam - i;
    const tasks: PlanTask[] = [];

    if (left != null && left < 0) break;
    if (left === 0) {
      tasks.push({ kind: 'rest', label: 'Exam day', detail: 'Skim your saved questions, then rest. You have done the work.', minutes: 10 });
      plan.push({ date, tasks });
      break;
    }

    if (i === 0 && input.answered === 0) {
      tasks.push({ kind: 'diagnostic', label: 'Take the diagnostic', detail: '15 questions across the syllabus to find your starting point.', minutes: 20 });
      plan.push({ date, tasks });
      continue;
    }

    if (i === 0 && input.due > 0) {
      const n = Math.min(input.due, 20);
      tasks.push({ kind: 'review', label: `Review ${n} due question${n === 1 ? '' : 's'}`, detail: 'Spaced review of questions you missed before.', minutes: Math.max(3, Math.round((n * input.secondsPerItem) / 90)), count: n });
    }

    if (left === 2) {
      tasks.push({ kind: 'full', label: 'Full mock exam', detail: 'A final dress rehearsal under real timing.', minutes: input.fullMinutes });
    } else if (left === 1) {
      tasks.push({ kind: 'review', label: 'Light review', detail: 'Only your due and saved questions. Keep it short.', minutes: 15 });
    } else {
      const skill = order[skillCursor % Math.max(1, order.length)];
      skillCursor += 1;
      if (skill) {
        const why = !skill.answered ? 'not practised yet' : `at ${Math.round(skill.mastery * 100)}% mastery`;
        tasks.push({ kind: 'drill', label: `Drill ${skill.name}`, detail: `${drillSize} questions with explanations; ${why}.`, minutes: drillMinutes, skillId: skill.skillId, count: drillSize });
      }
      const mockEvery = left != null && left <= 10 ? 2 : 4;
      if (i > 0 && i % mockEvery === mockEvery - 1) {
        tasks.push({ kind: 'quick', label: 'Quick mock', detail: `${input.quickItems} questions in ${input.quickMinutes} minutes to check your progress.`, minutes: input.quickMinutes });
      }
    }
    plan.push({ date, tasks });
  }
  return plan;
}

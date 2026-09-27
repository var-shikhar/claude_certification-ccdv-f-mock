import { describe, expect, test } from 'vitest';
import { loadExamBundle } from '@/lib/content/load';
import { computeReadiness, levelFor } from '@/lib/readiness';
import { computeStreak } from '@/lib/streak';
import { schedule, NEW_CARD } from '@/lib/srs';
import { buildPlan, prioritiseSkills } from '@/lib/study-plan';

const { config: EXAM } = loadExamBundle('ccdv-f');

describe('readiness', () => {
  test('no history means no prediction', () => {
    const r = computeReadiness(EXAM, []);
    expect(r.readiness).toBeNull();
    expect(r.confidence).toBe('none');
    expect(r.skills.every((s) => s.level === 'new')).toBe(true);
  });

  test('all-correct history across every skill predicts a pass with high readiness', () => {
    const history = EXAM.skills.flatMap((s) => Array.from({ length: 8 }, () => ({ skill: s.id, difficulty: 2, correct: true })));
    const r = computeReadiness(EXAM, history);
    expect(r.predictedScaled!).toBeGreaterThan(EXAM.scale.passing);
    expect(r.readiness!).toBeGreaterThan(90);
    expect(r.confidence).toBe('high');
  });

  test('all-wrong history predicts a fail', () => {
    const history = EXAM.skills.flatMap((s) => Array.from({ length: 6 }, () => ({ skill: s.id, difficulty: 2, correct: false })));
    const r = computeReadiness(EXAM, history);
    expect(r.predictedScaled!).toBeLessThan(EXAM.scale.passing);
    expect(r.readiness!).toBeLessThan(10);
  });

  test('two lucky answers do not read as mastery', () => {
    const r = computeReadiness(EXAM, [{ skill: 'hooks', difficulty: 1, correct: true }, { skill: 'hooks', difficulty: 1, correct: true }]);
    const hooks = r.skills.find((s) => s.skillId === 'hooks')!;
    expect(hooks.mastery).toBeLessThan(0.8);
    expect(r.confidence).toBe('low');
  });

  test('recent answers outweigh old ones', () => {
    const improving = [
      ...Array.from({ length: 6 }, () => ({ skill: 'hooks', difficulty: 2, correct: true })),
      ...Array.from({ length: 6 }, () => ({ skill: 'hooks', difficulty: 2, correct: false })),
    ];
    const declining = [...improving].reverse();
    const a = computeReadiness(EXAM, improving).skills.find((s) => s.skillId === 'hooks')!;
    const b = computeReadiness(EXAM, declining).skills.find((s) => s.skillId === 'hooks')!;
    expect(a.mastery).toBeGreaterThan(b.mastery);
  });

  test('mastery levels', () => {
    expect(levelFor(0, 0.9)).toBe('new');
    expect(levelFor(5, 0.85)).toBe('strong');
    expect(levelFor(5, 0.65)).toBe('fair');
    expect(levelFor(5, 0.3)).toBe('weak');
  });
});

describe('streaks', () => {
  test('counts consecutive days ending today or yesterday', () => {
    expect(computeStreak(['2026-09-25', '2026-09-26', '2026-09-27'], '2026-09-27')).toMatchObject({ current: 3, activeToday: true });
    expect(computeStreak(['2026-09-25', '2026-09-26'], '2026-09-27')).toMatchObject({ current: 2, activeToday: false });
    expect(computeStreak(['2026-09-20', '2026-09-26'], '2026-09-28')).toMatchObject({ current: 0 });
    expect(computeStreak(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10'], '2026-09-10').best).toBe(3);
  });
});

describe('spaced repetition', () => {
  test('a miss comes back tomorrow; hits push it further out', () => {
    const now = new Date('2026-09-27T10:00:00Z');
    const miss = schedule(NEW_CARD, false, now);
    expect(miss.intervalDays).toBe(1);
    expect(miss.due.toISOString()).toBe('2026-09-28T10:00:00.000Z');
    const hit1 = schedule(miss, true, now);
    const hit2 = schedule(hit1, true, now);
    const hit3 = schedule(hit2, true, now);
    expect(hit1.intervalDays).toBe(1);
    expect(hit2.intervalDays).toBe(3);
    expect(hit3.intervalDays).toBeGreaterThan(3);
    expect(schedule(hit3, false, now).lapses).toBe(miss.lapses + 1);
  });
});

describe('study plan', () => {
  const base = {
    today: '2026-09-27', targetDate: null as string | null, answered: 40, due: 0, dailyGoal: 10,
    secondsPerItem: 135, quickItems: 20, quickMinutes: 45, fullMinutes: 120,
  };
  const skills = computeReadiness(EXAM, EXAM.skills.flatMap((s, i) => Array.from({ length: 4 }, () => ({ skill: s.id, difficulty: 2, correct: i % 3 !== 0 })))).skills;

  test('a brand-new learner starts with the diagnostic', () => {
    const plan = buildPlan({ ...base, answered: 0, skills });
    expect(plan[0].tasks[0].kind).toBe('diagnostic');
    expect(plan).toHaveLength(7);
  });

  test('due reviews come first today, then the highest-gain drill', () => {
    const plan = buildPlan({ ...base, due: 7, skills });
    expect(plan[0].tasks.map((t) => t.kind)).toEqual(['review', 'drill']);
    const top = prioritiseSkills(skills)[0];
    expect(plan[0].tasks[1].skillId).toBe(top.skillId);
  });

  test('the plan tapers into a full mock and ends on exam day', () => {
    const plan = buildPlan({ ...base, targetDate: '2026-10-01', skills });
    expect(plan.map((d) => d.date)).toEqual(['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01']);
    expect(plan[2].tasks.some((t) => t.kind === 'full')).toBe(true);
    expect(plan[4].tasks[0].kind).toBe('rest');
  });
});

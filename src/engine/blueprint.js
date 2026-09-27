// Blueprint helpers. Everything exam-specific (domains, skills and their
// weights, timing, scale, difficulty modes) lives in exams/<id>/exam.json;
// these functions only interpret it.

export const domainById = (exam, id) => exam.domains.find((d) => d.id === id);
export const skillById = (exam, id) => exam.skills.find((s) => s.id === id);
export const levelWeight = (exam, difficulty) => exam.difficultyLevels[String(difficulty)]?.weight ?? 1;
export const difficultyMode = (exam, key) => exam.difficultyModes[key] ?? exam.difficultyModes[exam.defaultDifficultyMode];

/**
 * Number of items each skill contributes to a form of `total` items, using
 * the largest-remainder method so the form tracks the blueprint as closely
 * as whole items allow. Ties go to the heavier skill, then blueprint order.
 */
export function skillAllocation(exam, total = exam.itemCount) {
  const sum = exam.skills.reduce((acc, s) => acc + s.weight, 0);
  const rows = exam.skills.map((s, i) => {
    const exact = (s.weight / sum) * total;
    return { id: s.id, weight: s.weight, order: i, count: Math.floor(exact), rem: exact - Math.floor(exact) };
  });
  let left = total - rows.reduce((acc, r) => acc + r.count, 0);
  const byRemainder = [...rows].sort((a, b) => b.rem - a.rem || b.weight - a.weight || a.order - b.order);
  for (const r of byRemainder) {
    if (left <= 0) break;
    r.count += 1;
    left -= 1;
  }
  return Object.fromEntries(rows.map((r) => [r.id, r.count]));
}

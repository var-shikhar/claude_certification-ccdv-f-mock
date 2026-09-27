// Spaced repetition (SM-2 flavoured). A card is created the first time a
// learner misses an item (or saves it for review). Each later answer
// reschedules it: a miss brings it back tomorrow, a hit pushes it out by a
// growing interval. Cards that reach a long interval simply stop coming due.

export interface CardState { intervalDays: number; ease: number; reps: number; lapses: number }

export const NEW_CARD: CardState = { intervalDays: 0, ease: 2.5, reps: 0, lapses: 0 };
const DAY = 86_400_000;

export function schedule(card: CardState, correct: boolean, now = new Date()): CardState & { due: Date } {
  if (!correct) {
    const next = { intervalDays: 1, ease: Math.max(1.3, card.ease - 0.2), reps: 0, lapses: card.lapses + 1 };
    return { ...next, due: new Date(now.getTime() + DAY) };
  }
  const reps = card.reps + 1;
  const intervalDays = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(Math.max(card.intervalDays, 1) * card.ease);
  const ease = Math.min(3, card.ease + 0.05);
  return { intervalDays, ease, reps, lapses: card.lapses, due: new Date(now.getTime() + intervalDays * DAY) };
}

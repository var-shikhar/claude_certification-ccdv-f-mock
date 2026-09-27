/** Whole days from now until a YYYY-MM-DD date (negative once it has passed). */
export function daysUntil(date: string): number {
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - Date.now()) / 86_400_000);
}

export const isPast = (iso: string) => new Date(iso).getTime() < Date.now();

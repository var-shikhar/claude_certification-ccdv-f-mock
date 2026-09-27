// Item-analysis flags, shared by the server (which computes them) and the admin UI (which explains them).

export type ItemFlag = 'too-easy' | 'too-hard' | 'negative-discrimination' | 'weak-discrimination' | 'dead-distractor';

export const FLAG_INFO: Record<ItemFlag, { label: string; hint: string; tone: 'warn' | 'bad' }> = {
  'too-easy': { label: 'Too easy', hint: 'Over 95% answer correctly; it separates no one.', tone: 'warn' },
  'too-hard': { label: 'Too hard', hint: 'Under 20% answer correctly; check the key and wording.', tone: 'warn' },
  'negative-discrimination': { label: 'Key suspect', hint: 'Weaker candidates beat stronger ones on it. The key may be wrong.', tone: 'bad' },
  'weak-discrimination': { label: 'Weak signal', hint: 'Strong and weak candidates score about the same.', tone: 'warn' },
  'dead-distractor': { label: 'Dead distractor', hint: 'An option almost nobody picks. Make it more plausible.', tone: 'warn' },
};

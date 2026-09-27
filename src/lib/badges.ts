// Achievement badges: what they are and how they're earned (shared by the
// server, which awards them, and the UI, which shows them).

export interface BadgeDef { id: string; name: string; description: string; emoji: string }

export const BADGES: BadgeDef[] = [
  { id: 'first-steps', name: 'First steps', description: 'Answer your first question.', emoji: '🐒' },
  { id: 'know-thyself', name: 'Know thyself', description: 'Complete a diagnostic.', emoji: '🧭' },
  { id: 'century', name: 'Century', description: 'Answer 100 questions.', emoji: '💯' },
  { id: 'question-machine', name: 'Question machine', description: 'Answer 500 questions.', emoji: '⚙️' },
  { id: 'on-a-roll', name: 'On a roll', description: 'Practise 3 days in a row.', emoji: '🔥' },
  { id: 'week-warrior', name: 'Week warrior', description: 'Practise 7 days in a row.', emoji: '📅' },
  { id: 'unstoppable', name: 'Unstoppable', description: 'Practise 30 days in a row.', emoji: '🚀' },
  { id: 'exam-day', name: 'Exam day', description: 'Finish a full mock exam.', emoji: '⏱️' },
  { id: 'passed', name: 'Passed!', description: 'Pass a full mock exam.', emoji: '🏆' },
  { id: 'flawless', name: 'Flawless', description: 'Score 100% on a drill of 10 or more questions.', emoji: '✨' },
  { id: 'comeback', name: 'Comeback', description: 'Score 80% or more when retrying your mistakes.', emoji: '💪' },
  { id: 'interview-ready', name: 'Interview ready', description: 'Complete an AI mock interview.', emoji: '🎤' },
  { id: 'challenger', name: 'Challenger', description: 'Complete a friend\'s challenge.', emoji: '⚔️' },
];

export const badgeById = (id: string) => BADGES.find((b) => b.id === id);

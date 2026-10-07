import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface DrillPrefs {
  domains: number[];
  skills: string[];
  count: string;
  instant: boolean;
  timed: boolean;
  pool: 'bank' | 'imported' | 'all';
  difficulty: string;
}

interface PracticePrefsState {
  drills: Record<string, DrillPrefs>;
  mockDifficulty: Record<string, string>;
  saveDrill: (examId: string, prefs: DrillPrefs) => void;
  saveMockDifficulty: (examId: string, difficulty: string) => void;
}

/**
 * Remembers each exam's last drill setup and mock difficulty on this device,
 * so returning learners start from their own defaults. Hydrated on the client
 * only (see `skipHydration`) to keep server rendering deterministic.
 */
export const usePracticePrefs = create<PracticePrefsState>()(
  persist(
    (set) => ({
      drills: {},
      mockDifficulty: {},
      saveDrill: (examId, prefs) => set((s) => ({ drills: { ...s.drills, [examId]: prefs } })),
      saveMockDifficulty: (examId, difficulty) => set((s) => ({ mockDifficulty: { ...s.mockDifficulty, [examId]: difficulty } })),
    }),
    { name: 'quizzmonkey.practice', storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

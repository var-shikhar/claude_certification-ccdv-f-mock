import { create } from 'zustand';

export type SetupKind = 'full' | 'quick' | 'practice';

/** Which practice setup sheet is open on the exam hub (shared by the progress card and the practice cards). */
export const useHubUi = create<{ setup: SetupKind | null; openSetup: (s: SetupKind) => void; closeSetup: () => void }>((set) => ({
  setup: null,
  openSetup: (setup) => set({ setup }),
  closeSetup: () => set({ setup: null }),
}));

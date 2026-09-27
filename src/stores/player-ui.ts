import { create } from 'zustand';

export type NavigatorFilter = 'all' | 'unanswered' | 'flagged';

interface PlayerUiState {
  navigatorOpen: boolean;
  finishOpen: boolean;
  filter: NavigatorFilter;
  /** true while the case-study panel is expanded */
  caseOpen: boolean;
  setNavigatorOpen: (open: boolean) => void;
  setFinishOpen: (open: boolean) => void;
  setFilter: (filter: NavigatorFilter) => void;
  setCaseOpen: (open: boolean) => void;
  reset: () => void;
}

/** UI-only state of the exam player (server state lives in TanStack Query). */
export const usePlayerUi = create<PlayerUiState>((set) => ({
  navigatorOpen: false,
  finishOpen: false,
  filter: 'all',
  caseOpen: true,
  setNavigatorOpen: (navigatorOpen) => set({ navigatorOpen }),
  setFinishOpen: (finishOpen) => set({ finishOpen }),
  setFilter: (filter) => set({ filter }),
  setCaseOpen: (caseOpen) => set({ caseOpen }),
  reset: () => set({ navigatorOpen: false, finishOpen: false, filter: 'all', caseOpen: true }),
}));

import { create } from "zustand";

import type { QuestionType } from "./guided-model";

// ponytail: estado en memoria; si se recarga la página, el recorrido vuelve a empezar.
export interface GuidedState {
  readonly active: boolean;
  /** Índice de la fase actual (0 a 5). */
  readonly phase: number;
  readonly question: string;
  readonly questionType: QuestionType | null;
  /** Comprobaciones marcadas en la evaluación. */
  readonly checks: readonly string[];
  start: () => void;
  stop: () => void;
  setPhase: (phase: number) => void;
  setQuestion: (question: string) => void;
  setQuestionType: (type: QuestionType) => void;
  toggleCheck: (check: string, done: boolean) => void;
}

export const useGuidedStore = create<GuidedState>()((set) => ({
  active: false,
  phase: 0,
  question: "",
  questionType: null,
  checks: [],
  start: () => set({ active: true, phase: 0 }),
  stop: () => set({ active: false }),
  setPhase: (phase) => set({ phase: Math.max(0, Math.min(5, phase)) }),
  setQuestion: (question) => set({ question }),
  setQuestionType: (questionType) => set({ questionType, checks: [] }),
  toggleCheck: (check, done) =>
    set((state) => ({
      checks: done
        ? [...state.checks.filter((entry) => entry !== check), check]
        : state.checks.filter((entry) => entry !== check),
    })),
}));

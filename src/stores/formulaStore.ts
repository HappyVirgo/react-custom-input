import { create } from 'zustand';

interface FormulaState {
  formula: string;
  variables: Record<string, number>;
  setFormula: (formula: string) => void;
  setVariables: (variables: Record<string, number>) => void;
}

export const useFormulaStore = create<FormulaState>()((set) => ({
  formula: '',
  variables: {},
  setFormula: (formula) => set({ formula }),
  setVariables: (variables) => set({ variables }),
}));
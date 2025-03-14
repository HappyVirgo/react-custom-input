import { create } from 'zustand';

export type Tag = {
  id: string;
  name: string | null;
  value: string | number;
  type: 'variable' | 'operator' | 'number';
};

type FormulaStore = {
  tags: Tag[];
  addTag: (tag: Tag) => void;
  removeTag: (id: string) => void;
};

export const useFormulaStore = create<FormulaStore>((set) => ({
  tags: [],
  addTag: (tag) => set((state) => ({ tags: [...state.tags, tag] })),
  removeTag: (id) => set((state) => ({ tags: state.tags.filter(tag => tag.id !== id) })),
}));
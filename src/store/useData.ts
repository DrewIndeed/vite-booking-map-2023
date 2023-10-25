import { create } from "zustand";

interface useDataStore {
  data: object;
  saveData: (newData: any) => void;
}

export const useData = create<useDataStore>((set) => ({
  data: {},
  saveData: (newData) =>
    set((state) => ({ data: { ...state.data, ...newData } })),
}));

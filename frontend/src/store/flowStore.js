import { create } from 'zustand';
import { flowAPI } from '../services/api';

export const useFlowStore = create((set) => ({
  flows: [],
  activeFlow: null,
  isLoading: false,

  fetchFlows: async () => {
    set({ isLoading: true });
    try {
      const { data } = await flowAPI.getAll();
      set({ flows: data.data.flows, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  setActiveFlow: (flow) => set({ activeFlow: flow })
}));

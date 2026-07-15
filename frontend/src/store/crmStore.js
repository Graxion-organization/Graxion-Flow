import { create } from 'zustand';
import { contactAPI, templateAPI, broadcastAPI, campaignAPI } from '../services/api';

export const useCrmStore = create((set, get) => ({
  contacts: [],
  templates: [],
  broadcasts: [],
  campaigns: [],
  isLoading: false,

  fetchContacts: async (params) => {
    set({ isLoading: true });
    try {
      const { data } = await contactAPI.getAll(params);
      set({ contacts: data.data.contacts, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  fetchTemplates: async () => {
    set({ isLoading: true });
    try {
      const { data } = await templateAPI.getAll();
      set({ templates: data.data.templates, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  fetchBroadcasts: async () => {
    set({ isLoading: true });
    try {
      const { data } = await broadcastAPI.getAll();
      set({ broadcasts: data.data.broadcasts, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  fetchCampaigns: async () => {
    set({ isLoading: true });
    try {
      const { data } = await campaignAPI.getAll();
      set({ campaigns: data.data.campaigns, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  }
}));

const fs = require('fs');
const path = require('path');

const crmStore = `import { create } from 'zustand';
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
`;

const flowStore = `import { create } from 'zustand';
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
`;

fs.writeFileSync(path.join(__dirname, 'src', 'store', 'crmStore.js'), crmStore);
fs.writeFileSync(path.join(__dirname, 'src', 'store', 'flowStore.js'), flowStore);

// Also cache feature flag logic in index.js
let storeIndex = fs.readFileSync(path.join(__dirname, 'src', 'store', 'index.js'), 'utf8');
if (!storeIndex.includes('flagsFetchedAt')) {
  storeIndex = storeIndex.replace(
    'flags: {},',
    'flags: {},\n      flagsFetchedAt: null,'
  );
  storeIndex = storeIndex.replace(
    'fetchFlags: async () => {',
    `fetchFlags: async () => {
        const { flagsFetchedAt } = get();
        if (flagsFetchedAt && Date.now() - flagsFetchedAt < 5 * 60 * 1000) {
          return; // Cache for 5 mins
        }`
  );
  storeIndex = storeIndex.replace(
    'set({ flags: data.data, isLoading: false });',
    'set({ flags: data.data, flagsFetchedAt: Date.now(), isLoading: false });'
  );
  fs.writeFileSync(path.join(__dirname, 'src', 'store', 'index.js'), storeIndex);
}

console.log('Stores created and feature flag cached.');

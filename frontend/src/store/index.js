import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, adminAPI, featureFlagAPI } from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user }),

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const res = await authAPI.login(credentials);
          const token = res.data.token || res.data.data?.token;
          if (token) localStorage.setItem('authToken', token);
          const { data } = res.data;
          useOrganizationStore.getState().clearOrganizations();
          set({ user: data.user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return {
            success: false,
            message: err.response?.data?.message,
            action: err.response?.data?.action,
            otpToken: err.response?.data?.otpToken
          };
        }
      },

      adminLogin: async (credentials) => {
        set({ isLoading: true });
        try {
          const res = await authAPI.adminLogin(credentials);
          if (res.data && res.data.action === 'require_otp') {
            set({ isLoading: false });
            return {
              success: false,
              action: res.data.action,
              message: res.data.message,
              otpToken: res.data.otpToken
            };
          }
          const token = res.data.token || res.data.data?.token;
          if (token) localStorage.setItem('authToken', token);
          const { data } = res.data;
          useOrganizationStore.getState().clearOrganizations();
          set({ user: data.user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return {
            success: false,
            message: err.response?.data?.message,
            action: err.response?.data?.action,
            otpToken: err.response?.data?.otpToken
          };
        }
      },

      adminRegister: async (data) => {
        set({ isLoading: true });
        try {
          const res = await authAPI.adminRegister(data);
          if (res.status === 202) {
            set({ isLoading: false });
            return {
              success: true,
              pendingApproval: true,
              message: res.data?.message
            };
          }
          const token = res.data.token || res.data.data?.token;
          if (token) localStorage.setItem('authToken', token);
          const { data: { user } } = res.data;
          useOrganizationStore.getState().clearOrganizations();
          set({ user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return {
            success: false,
            message: err.response?.data?.message
          };
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const res = await authAPI.register(data);
          const token = res.data.token || res.data.data?.token;
          if (token) localStorage.setItem('authToken', token);
          const { data: { user } } = res.data;
          useOrganizationStore.getState().clearOrganizations();
          set({ user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return {
            success: false,
            message: err.response?.data?.message,
            action: err.response?.data?.action,
            otpToken: err.response?.data?.otpToken
          };
        }
      },

      logout: async () => {
        try { await authAPI.logout(); } catch { }
        localStorage.removeItem('authToken');
        useOrganizationStore.getState().clearOrganizations();
        set({ user: null, isAuthenticated: false });
      },

      fetchUser: async () => {
        try {
          const res = await authAPI.getMe();
          set({ user: res.data.data.user });
        } catch (err) {
          if (err.response?.status === 401 && !localStorage.getItem('authToken')) {
            get().logout();
          }
        }
      },
    }),
    { name: 'auth-store', partialize: (s) => ({ isAuthenticated: s.isAuthenticated }) }
  )
);

export const useAgentStore = create((set) => ({
  agents: [],
  selectedAgent: null,
  setAgents: (agents) => set({ agents }),
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
  addAgent: (agent) => set((s) => ({ agents: [...s.agents, agent] })),
  updateAgent: (id, data) => set((s) => ({
    agents: s.agents.map((a) => (a._id === id ? { ...a, ...data } : a)),
  })),
  removeAgent: (id) => set((s) => ({ agents: s.agents.filter((a) => a._id !== id) })),
}));

export const useConversationStore = create((set) => ({
  conversations: [],
  selectedConversation: null,
  unreadCount: 0,
  setConversations: (conversations) => set({ conversations }),
  setSelectedConversation: (c) => set({ selectedConversation: c }),
  setUnreadCount: (n) => set({ unreadCount: n }),
}));

export const useNotificationStore = create((set, get) => ({
  notifications: [],    // { id, type, title, message, conversationId, platform, timestamp, read }
  unreadCount: 0,

  // Called when backend REST API loads historical unread items
  setFromAPI: ({ notifications, totalUnread }) => {
    set({ notifications, unreadCount: totalUnread });
  },

  // Called when a real-time socket event comes in
  addNotification: (notif) => {
    set((state) => {
      // Avoid duplicate by id
      const exists = state.notifications.some((n) => n.id === notif.id);
      if (exists) return state;
      return {
        notifications: [notif, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      };
    });
  },

  // Mark one notification as read
  markRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  // Mark all as read
  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  // Decrement unread count (used when user navigates to conversation)
  decrementUnread: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
}));

export const useOrganizationStore = create(
  persist(
    (set) => ({
      organizations: [],
      currentOrganization: null,
      isLoading: false,

      setOrganizations: (organizations) => set({ organizations }),
      setCurrentOrganization: (org) => {
        if (org) {
          localStorage.setItem('organizationId', org._id);
        } else {
          localStorage.removeItem('organizationId');
        }
        set({ currentOrganization: org });
      },
      addOrganization: (org) => set((s) => ({ organizations: [...s.organizations, org] })),
      clearOrganizations: () => {
        localStorage.removeItem('organizationId');
        set({ organizations: [], currentOrganization: null });
      },
    }),
    {
      name: 'org-store',
      partialize: (s) => ({ currentOrganization: s.currentOrganization })
    }
  )
);

export const useBrandingStore = create((set, get) => ({
  branding: {
    branding_site_name: 'Graxion',
    branding_logo_url: '',
    branding_contact_email: 'Yogeshkaushik138@gmail.com',
    branding_contact_phone: '+918685041359',
    branding_favicon_url: '',
    branding_address: 'VPO Roopgarh JInd Haryana India',
    branding_address_desc: 'The heart of innovation.',
    branding_footer_text: '© 2026 Graxion Inc. All rights reserved.',
    branding_hero_title: 'Automate Your Business Communication',
    branding_hero_subtitle: 'Deploy AI-powered agents across WhatsApp, Instagram, and Telegram. Automate customer support, close deals, and scale your operations effortlessly.',
    branding_tagline: 'The Next-Gen Automation Platform',
    branding_social_twitter: '',
    branding_social_linkedin: '',
    branding_social_instagram: '',
    branding_social_youtube: '',
    branding_features_json: '',
    registration_enabled: true,
    razorpay_enabled: true,
    cashfree_enabled: true
  },
  isLoading: false,

  fetchBranding: async () => {
    set({ isLoading: true });
    try {
      const res = await adminAPI.getPublicSettings();
      const data = res.data.data;

      // Dynamic favicon update
      if (data.branding_favicon_url) {
        const link = document.querySelector("link[rel~='icon']");
        if (link) {
          link.href = data.branding_favicon_url;
        } else {
          const newLink = document.createElement('link');
          newLink.rel = 'icon';
          newLink.href = data.branding_favicon_url;
          document.head.appendChild(newLink);
        }
      }

      // Dynamic website title base update
      if (data.branding_site_name) {
        const currentTitle = document.title;
        if (!currentTitle.includes(data.branding_site_name)) {
          if (currentTitle.includes('|')) {
            const parts = currentTitle.split('|');
            document.title = `${parts[0].trim()} | ${data.branding_site_name}`;
          } else {
            document.title = `${currentTitle} | ${data.branding_site_name}`;
          }
        }
      }

      set({ branding: data, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  }
}));

export const useFeatureFlagStore = create((set, get) => ({
  flags: {},
  flagsFetchedAt: null,
  isLoading: false,
  error: null,

  evaluateFlags: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await featureFlagAPI.evaluate();
      set({ flags: res.data.data.flags, isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to evaluate feature flags', isLoading: false });
    }
  },

  isEnabled: (key) => {
    return !!get().flags[key];
  }
}));


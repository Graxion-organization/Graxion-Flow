import axios from 'axios';
import toast from 'react-hot-toast';

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 60000,
});

let csrfToken = null;
let fetchingCsrfPromise = null;

export const fetchCsrfToken = async () => {
  if (fetchingCsrfPromise) {
    return fetchingCsrfPromise;
  }
  fetchingCsrfPromise = (async () => {
    try {
      if (typeof document !== 'undefined' && document.requestStorageAccess) {
        await document.requestStorageAccess().catch(() => {});
      }
      const res = await api.get('/auth/csrf');
      csrfToken = res.data.csrfToken;
      return csrfToken;
    } catch (err) {
      console.error('Failed to fetch CSRF token', err);
      return null;
    } finally {
      fetchingCsrfPromise = null;
    }
  })();
  return fetchingCsrfPromise;
};

// Request interceptor - attach headers
api.interceptors.request.use(
  async (config) => {
    const method = config.method?.toLowerCase();
    const isMutating = !['get', 'head', 'options'].includes(method);
    const isCsrfUrl = config.url?.includes('/auth/csrf');

    if (isMutating && !isCsrfUrl && !csrfToken) {
      await fetchCsrfToken();
    }

    if (csrfToken && isMutating && !isCsrfUrl) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    const organizationId = localStorage.getItem('organizationId');
    if (organizationId) config.headers['X-Organization-Id'] = organizationId;

    const authToken = localStorage.getItem('authToken');
    if (authToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors + token refresh + CSRF retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const message = error.response?.data?.message || 'Something went wrong.';

    if (message === 'Your token has expired. Please log in again.') {
      toast.error(message);
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Retry CSRF token if request failed with 403 CSRF error
    if (
      error.response?.status === 403 &&
      typeof error.response?.data?.message === 'string' &&
      error.response.data.message.toLowerCase().includes('csrf') &&
      !originalRequest._csrfRetry
    ) {
      originalRequest._csrfRetry = true;
      try {
        const newToken = await fetchCsrfToken();
        if (newToken) {
          originalRequest.headers['X-CSRF-Token'] = newToken;
          return api(originalRequest);
        }
      } catch (csrfErr) {
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const url = originalRequest.url?.toLowerCase() || '';
      const isAuthEndpoint = url.includes('/auth/login') ||
                             url.includes('/auth/register') ||
                             url.includes('/auth/refresh-token') ||
                             url.includes('/auth/csrf');

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        await api.post('/auth/refresh-token');
        // Retry the original request (cookies are automatically included)
        return api(originalRequest);
      } catch (refreshErr) {
        // Only redirect to login if user is attempting to access a protected app/admin route
        const path = window.location.pathname.toLowerCase();
        if (path.startsWith('/app') || path.startsWith('/admin')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    const isOrgError = message === 'Please select or create an organization to continue.';
    
    if (isOrgError) {
      // Clear stale organization ID so DashboardLayout can auto-create a new one
      localStorage.removeItem('organizationId');
      localStorage.removeItem('org-store');

      if (window.location.pathname.startsWith('/app')) {
        const lastReload = sessionStorage.getItem('orgErrorReloadTime');
        const now = Date.now();
        if (lastReload && now - parseInt(lastReload, 10) < 5000) {
          // Loop detected, redirect to dashboard instead of reloading
          window.location.href = '/app/dashboard';
        } else {
          sessionStorage.setItem('orgErrorReloadTime', now.toString());
          window.location.reload();
        }
      }
    } else if (error.response?.status !== 401) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  ssoLogin: (data) => api.post('/auth/sso/graxion', data),
  adminLogin: (data) => api.post('/auth/admin/login', data),
  adminRegister: (data) => api.post('/auth/admin/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/update-profile', data),
  changePassword: (data) => api.patch('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, data) => api.patch(`/auth/reset-password/${token}`, data),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  requestDeletion: () => api.post('/auth/request-deletion'),
  sendDeletionOTP: () => api.post('/auth/send-deletion-otp'),
  confirmDeletion: (data) => api.post('/auth/confirm-deletion', data),
  cancelDeletionRequest: () => api.post('/auth/cancel-deletion-request'),
  getOnboardingStatus: () => api.get('/auth/onboarding-status'),
};

// WhatsApp 
export const whatsappAPI = {
  connect: (data) => api.post('/whatsapp/connect', data),
  getAll: () => api.get('/whatsapp'),
  getOne: (id) => api.get(`/whatsapp/${id}`),
  verify: (id) => api.post(`/whatsapp/${id}/verify`),
  disconnect: (id) => api.delete(`/whatsapp/${id}`),
  getQualityRating: (id) => api.get(`/whatsapp/accounts/${id}/quality-rating`),
  // Embedded Signup
  embeddedSignupCallback: (code, redirectUri, appId) => api.post('/whatsapp/embedded-signup/callback', { code, redirectUri, appId }),
  embeddedSignupSave: (data) => api.post('/whatsapp/embedded-signup/save', data),
};

// Telegram
export const telegramAPI = {
  getAll: () => api.get('/telegram/accounts'),
  connect: (data) => api.post('/telegram/connect', data),
  disconnect: (id) => api.delete(`/telegram/accounts/${id}`),
};

export const facebookAPI = {
  getAll: () => api.get('/facebook/accounts'),
  autoConnect: (accessToken) => api.post('/facebook/auto-connect', { accessToken }),
  getAccounts: () => api.get('/facebook/accounts'),
  updateBot: (id, data) => api.patch(`/facebook/accounts/${id}/bot`, data),
  disconnectAccount: (id) => api.delete(`/facebook/accounts/${id}`),
};

// Instagram
export const instagramAPI = {
  connect: (data) => api.post('/instagram/connect', data),
  autoConnect: (data) => api.post('/instagram/auto-connect', data),
  getAll: () => api.get('/instagram'),
  disconnect: (id) => api.delete(`/instagram/${id}`),
  updateBotSettings: (id, data) => api.patch(`/instagram/${id}/bot`, data),
};

// Agents
export const agentAPI = {
  create: (data) => api.post('/agents', data),
  getAll: () => api.get('/agents'),
  getOne: (id) => api.get(`/agents/${id}`),
  update: (id, data) => api.patch(`/agents/${id}`, data),
  delete: (id) => api.delete(`/agents/${id}`),
  toggle: (id) => api.post(`/agents/${id}/toggle`),
  test: (id, message) => api.post(`/agents/${id}/test`, { message }),
  getModels: () => api.get('/agents/models'),
  uploadKnowledgeBase: (id, formData) => api.post(`/agents/${id}/knowledge-base`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  addKnowledgeText: (id, textPrompt) => api.post(`/agents/${id}/knowledge-base`, { textPrompt }),
  deleteKnowledgeBaseEntry: (id, entryIndex) => api.delete(`/agents/${id}/knowledge-base/${entryIndex}`),
};

// Integrations
export const integrationsAPI = {
  getAll: () => api.get('/integrations'),
  connect: (platform, data) => api.post(`/integrations/connect/${platform}`, data),
  disconnect: (platform) => api.delete(`/integrations/disconnect/${platform}`),
};

// Meetings (AI Presenter)
export const meetingAPI = {
  getAll: () => api.get('/meetings'),
  create: (data) => api.post('/meetings', data),
  update: (id, data) => api.put(`/meetings/${id}`, data),
  delete: (id) => api.delete(`/meetings/${id}`),
  startBot: (id) => api.post(`/meetings/${id}/start`),
  complete: (id) => api.post(`/meetings/${id}/complete`),
  getSdkSignature: (id) => api.get(`/meetings/${id}/sdk-signature`),
  // Upload a video file (mp4/mov/webm) for video presentations
  uploadVideo: (formData, onUploadProgress) => api.post('/meetings/upload-video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000, // 10 minutes for large videos
    onUploadProgress
  }),
};

// Conversations
export const conversationAPI = {
  getAll: (params) => api.get('/conversations', { params }),
  getOne: (id) => api.get(`/conversations/${id}`),
  getMessages: (id, params) => api.get(`/conversations/${id}/messages`, { params }),
  reply: (id, message) => api.post(`/conversations/${id}/reply`, { message }),
  close: (id) => api.patch(`/conversations/${id}/close`),
  getStats: () => api.get('/conversations/stats'),
  getLeads: (params) => api.get('/conversations/leads', { params }),
  toggleStatus: (id, status) => api.patch(`/conversations/${id}/toggle-status`, { status }),
  getTemplates: (id) => api.get(`/conversations/${id}/templates`),
  sendTemplate: (id, data) => api.post(`/conversations/${id}/send-template`, data),
  createTemplate: (id, data) => api.post(`/conversations/${id}/templates`, data),
};

// Billing
export const billingAPI = {
  getPlans: () => api.get('/billing/plans'),
  createOrder: (plan, gateway = 'razorpay', numberOfOrgs = 1) => api.post('/billing/create-order', { plan, gateway, numberOfOrgs }),
  verifyPayment: (data) => api.post('/billing/verify-payment', data),
  getHistory: () => api.get('/billing/history'),
  getCreditsHistory: () => api.get('/billing/credits/history'),
  cancel: () => api.delete('/billing/cancel'),
};

// YouTube
export const youtubeAPI = {
  getAll: () => api.get('/youtube/manual/accounts'),
  getAuthUrl: () => api.get('/youtube/auth-url'),
  callback: (code) => api.post('/youtube/callback', { code }),
  disconnect: () => api.post('/youtube/disconnect'),
  getAutomationSettings: () => api.get('/youtube/automation/settings'),
  updateAutomationSettings: (data) => api.patch('/youtube/automation/settings', data),
  getPendingComments: () => api.get('/youtube/automation/pending'),
  getAutomationHistory: () => api.get('/youtube/automation/history'),
  approveReply: (commentId, customReply) => api.post('/youtube/automation/approve', { commentId, customReply }),
  ignoreComment: (commentId) => api.post('/youtube/automation/ignore', { commentId }),
};

// Social Hub
export const socialHubAPI = {
  getAccounts: () => api.get('/social-hub/accounts'),
  validate: (data) => api.post('/social-hub/validate', data),
  formatPreview: (data) => api.post('/social-hub/format-preview', data),
  publish: (data) => api.post('/social-hub/publish', data),
  getHistory: () => api.get('/social-hub/history'),
  getAnalytics: () => api.get('/social-hub/analytics'),
  getAllLinkedInAccounts: () => api.get('/social-hub/linkedin/manual/accounts'),
  retryPlatform: (data) => api.post('/social-hub/retry', data),
  updateProfile: (data) => api.post('/social-hub/profile', data),
  upload: (formData) => api.post('/social-hub/upload', formData, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
  }),
   getFeed: () => api.get('/social-hub/feed'),
   updateJob: (jobId, data) => api.patch(`/social-hub/update-job/${jobId}`, data),
   deletePost: (data) => api.post('/social-hub/delete-post', data),
   getInsights: (platform, postId, accountId) => api.get(`/social-hub/insights?platform=${platform}&postId=${postId}&accountId=${accountId}`),
   generateImage: (data) => api.post('/ai/generate-image', data),
   getLinkedInAuthUrl: () => api.get('/social-hub/linkedin/auth-url'),
   linkedinCallback: (code) => api.post('/social-hub/linkedin/callback', { code }),
   disconnectLinkedIn: (id) => api.delete(`/social-hub/linkedin/${id}`),
   // AI-powered
   generateCaption: (data) => api.post('/social-hub/ai/caption', data),
   getTodayAnalytics: () => api.get('/social-hub/ai/today-analytics'),
   getBestTime: (platform) => api.get(`/social-hub/ai/best-time?platform=${platform}`),
};

// Sales Partner System
export const partnerAPI = {
  getDashboard: () => api.get('/partner/dashboard'),
  getPayouts: () => api.get('/partner/payouts'),
  adminGetPartners: () => api.get('/partner/admin/partners'),
  adminGetPartnerUsers: (partnerId) => api.get(`/partner/admin/partner-users/${partnerId}`),
  adminAssignRole: (data) => api.post('/partner/admin/assign-role', data),
  adminGetSettings: () => api.get('/partner/admin/settings'),
  adminUpdateSettings: (data) => api.patch('/partner/admin/settings', data),
  adminProcessPayout: (data) => api.post('/partner/admin/process-payout', data),
};

// Marketing Copilot
export const marketingCopilotAPI = {
  getCampaign: () => api.get('/marketing-copilot/campaign'),
  saveDetails: (data) => api.post('/marketing-copilot/details', data),
  generateStrategy: () => api.post('/marketing-copilot/strategy'),
  generateCalendar: () => api.post('/marketing-copilot/calendar'),
  generatePostAssets: (day, useStockVideo) => api.post('/marketing-copilot/generate-assets', { day, useStockVideo }),
  approveManual: (day, mediaUrl, mediaType) => api.post('/marketing-copilot/approve-manual', { day, mediaUrl, mediaType }),
  schedulePost: (day, scheduledAt) => api.post('/marketing-copilot/schedule', { day, scheduledAt }),
  scheduleAll: () => api.post('/marketing-copilot/schedule-all'),
  deleteCampaign: () => api.delete('/marketing-copilot/campaign'),
};

// Notifications
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (conversationIds) => api.patch('/notifications/mark-read', { conversationIds }),
  markAllRead: () => api.patch('/notifications/mark-read', { conversationIds: [] }),
};

// Admin
export const adminAPI = {
  getPublicSettings: () => api.get('/admin/public-settings'),
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserDetails: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  getHealth: () => api.get('/admin/health'),
  getSettings: () => api.get('/admin/settings'),
  updateSetting: (key, value) => api.patch('/admin/settings', { key, value }),
  getLogs: (params) => api.get('/admin/logs', { params }),
  getOrphanMedia: () => api.get('/admin/orphan-media'),
  deleteOrphanMedia: (publicIds) => api.delete('/admin/orphan-media', { data: { publicIds } }),
  getDeletionRequests: (params) => api.get('/admin/deletion-requests', { params }),
  cancelDeletion: (userId) => api.post(`/admin/users/${userId}/cancel-deletion`),
  requestRoleChange: (userId, role) => api.post(`/admin/users/${userId}/request-role-change`, { role }),
  confirmRoleChange: (userId, otp) => api.post(`/admin/users/${userId}/confirm-role-change`, { otp }),
  // Plan Management
  getPlans: () => api.get('/admin/plans'),
  createPlan: (data) => api.post('/admin/plans', data),
  updatePlan: (id, data) => api.patch(`/admin/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/admin/plans/${id}`),
  // Payments Management
  getPayments: (params) => api.get('/admin/payments', { params }),
  updatePaymentStatus: (id, status) => api.patch(`/admin/payments/${id}/status`, { status }),
  refundPayment: (id) => api.post(`/admin/payments/${id}/refund`),
  // Admin Signup Requests & Activity Auditing
  getSignupRequests: () => api.get('/admin/signup-requests'),
  sendSignupRequestOTP: (id) => api.post(`/admin/signup-requests/${id}/send-otp`),
  approveSignupRequest: (id, data) => api.post(`/admin/signup-requests/${id}/approve`, data),
  rejectSignupRequest: (id) => api.post(`/admin/signup-requests/${id}/reject`),
  getAdminActivities: (params) => api.get('/admin/activities', { params }),
};

// Organizations
export const organizationAPI = {
  getAll: () => api.get('/organizations'),
  create: (data) => api.post('/organizations', data),
  getOne: (id) => api.get(`/organizations/${id}`),
  switch: (id) => api.post(`/organizations/switch/${id}`),
  inviteMember: (data) => api.post('/organizations/invite', data),
  removeMember: (orgId, userId) => api.delete(`/organizations/${orgId}/members/${userId}`),
  getActivity: (orgId) => api.get(`/organizations/${orgId}/activity`),
  exportData: (orgId) => api.get(`/organizations/${orgId}/export`),
  delete: (id) => api.delete(`/organizations/${id}`),
};

// Feature Flags
export const featureFlagAPI = {
  evaluate: () => api.get('/feature-flags/evaluate'),
  getAll: () => api.get('/feature-flags'),
  getOne: (id) => api.get(`/feature-flags/${id}`),
  create: (data) => api.post('/feature-flags', data),
  update: (id, data) => api.patch(`/feature-flags/${id}`, data),
  delete: (id) => api.delete(`/feature-flags/${id}`),
  toggle: (id) => api.post(`/feature-flags/${id}/toggle`),
  setUserBeta: (userId, isBetaTester) => api.patch(`/feature-flags/users/${userId}/beta`, { isBetaTester }),
  getBetaTesters: () => api.get('/feature-flags/beta-testers')
};

// Contacts
export const contactAPI = {
  getAll: (params) => api.get('/contacts', { params }),
  getOne: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.patch(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
  importCsv: (formData) => api.post('/contacts/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
};

// Groups
export const contactGroupAPI = {
  getAll: () => api.get('/contact-groups'),
  create: (data) => api.post('/contact-groups', data),
  update: (id, data) => api.patch(`/contact-groups/${id}`, data),
  delete: (id) => api.delete(`/contact-groups/${id}`)
};

// Templates
export const templateAPI = {
  getAll: () => api.get('/templates'),
  getSystem: () => api.get('/templates/system'),
  sync: () => api.post('/templates/sync'),
  create: (data) => api.post('/templates', data),
  cloneSystem: (data) => api.post('/templates/clone-system', data),
  delete: (id) => api.delete(`/templates/${id}`),
  getOne: (id) => api.get(`/templates/${id}`)
};

// Broadcasts
export const broadcastAPI = {
  getAll: () => api.get('/broadcasts'),
  create: (data) => api.post('/broadcasts', data),
  getOne: (id) => api.get(`/broadcasts/${id}`)
};

// Campaigns
export const campaignAPI = {
  getAll: () => api.get('/campaigns'),
  create: (data) => api.post('/campaigns', data),
  getOne: (id) => api.get(`/campaigns/${id}`)
};

// Flows
export const flowAPI = {
  getAll: () => api.get('/flows'),
  create: (data) => api.post('/flows', data),
  getOne: (id) => api.get(`/flows/${id}`),
  update: (id, data) => api.patch(`/flows/${id}`, data),
  delete: (id) => api.delete(`/flows/${id}`)
};

// Keywords
export const keywordAPI = {
  getAll: () => api.get('/keywords'),
  create: (data) => api.post('/keywords', data),
  update: (id, data) => api.patch(`/keywords/${id}`, data),
  delete: (id) => api.delete(`/keywords/${id}`)
};

// Analytics
export const analyticsAPI = {
  getVolume: (params) => api.get('/analytics/volume', { params }),
  getCredits: () => api.get('/analytics/credits'),
  getAi: () => api.get('/analytics/ai'),
  getTemplates: () => api.get('/analytics/templates'),
  getBroadcasts: () => api.get('/analytics/broadcasts'),
  getAgents: () => api.get('/analytics/agents')
};

// Admin Analytics
export const adminAnalyticsAPI = {
  getRevenue: () => api.get('/admin/analytics/revenue'),
  getWebhookHealth: () => api.get('/admin/analytics/webhook-health'),
  getApiUsage: () => api.get('/admin/analytics/api-usage')
};

// Deals
export const dealAPI = {
  getAll: () => api.get('/deals'),
  create: (data) => api.post('/deals', data),
  update: (id, data) => api.patch(`/deals/${id}`, data),
  delete: (id) => api.delete(`/deals/${id}`),
};

export default api;

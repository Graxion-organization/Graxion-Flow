import React, { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { useAuthStore, useBrandingStore, useFeatureFlagStore } from "./store";
import { fetchCsrfToken } from "./services/api";
import { HelmetProvider } from "react-helmet-async";
import CookieConsentModal from "./components/ui/CookieConsentModal";
import SEO from "./components/seo/SEO";
import useCentralTracker from "./hooks/useCentralTracker";

// Traffic Tracker Component
const TrafficTracker = () => {
  useCentralTracker('flow');
  return null;
};

// Static layouts and wrappers (Kept static to ensure structural stability and avoid layout flashes)
import DashboardLayout from "./components/dashboard/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";

// Resilient lazy-loading helper with automatic retry on chunk failure
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page_has_been_force_refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page_has_been_force_refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page_has_been_force_refreshed', 'true');
        window.location.reload();
        return { default: () => null };
      }
      throw error;
    }
  });

// Lazy-loaded page-level components
const LoginPage = lazyWithRetry(() => import("./pages/LoginPage"));
const RegisterPage = lazyWithRetry(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazyWithRetry(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazyWithRetry(() => import("./pages/ResetPasswordPage"));
const DashboardPage = lazyWithRetry(() => import("./pages/DashboardPage"));
const AgentsPage = lazyWithRetry(() => import("./pages/AgentsPage"));
const ConversationsPage = lazyWithRetry(() => import("./pages/ConversationsPage"));
const BillingPage = lazyWithRetry(() => import("./pages/BillingPage"));
const SettingsPage = lazyWithRetry(() => import("./pages/SettingsPage"));
const TelegramPage = lazyWithRetry(() => import("./pages/TelegramPage"));
const InstagramPage = lazyWithRetry(() => import("./pages/InstagramPage"));
const IntegrationsPage = lazyWithRetry(() => import("./pages/IntegrationsPage"));
const SocialPublishingPage = lazyWithRetry(() => import("./pages/SocialPublishingPage"));
const LeadsDashboardPage = lazyWithRetry(() => import("./pages/LeadsDashboardPage"));
const CallbackPage = lazyWithRetry(() => import("./pages/CallbackPage"));
const SsoCallbackPage = lazyWithRetry(() => import("./pages/SsoCallbackPage"));
const WhatsAppSignup = lazyWithRetry(() => import("./pages/watsapphd"));
const AIPresenterPage = lazyWithRetry(() => import("./pages/AIPresenterPage"));
const YoutubeCallbackPage = lazyWithRetry(() => import("./pages/YoutubeCallbackPage"));
const LinkedinCallbackPage = lazyWithRetry(() => import("./pages/LinkedinCallbackPage"));
const AutomationHubPage = lazyWithRetry(() => import("./pages/AutomationHubPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Home = lazyWithRetry(() => import("./pages/Home"));
const ComingSoon = lazyWithRetry(() => import("./pages/ComingSoon"));
const OnboardingPage = lazyWithRetry(() => import("./pages/OnboardingPage"));
const SalesPartnerDashboard = lazyWithRetry(() => import("./pages/SalesPartnerDashboard"));

// Phase 8 New Pages
const ContactsPage = lazyWithRetry(() => import("./pages/ContactsPage"));
const TemplatesPage = lazyWithRetry(() => import("./pages/TemplatesPage"));
const BroadcastPage = lazyWithRetry(() => import("./pages/BroadcastPage"));
const CampaignsPage = lazyWithRetry(() => import("./pages/CampaignsPage"));
const WhatsAppMarketingSetup = lazyWithRetry(() => import("./pages/WhatsAppMarketingSetup"));
const FlowBuilderPage = lazyWithRetry(() => import("./pages/FlowBuilderPage"));
const KeywordTriggersPage = lazyWithRetry(() => import("./pages/KeywordTriggersPage"));
const AnalyticsPage = lazyWithRetry(() => import("./pages/AnalyticsPage"));
// Static pages
const About = lazyWithRetry(() => import("./pages/static/About"));
const Contact = lazyWithRetry(() => import("./pages/static/Contact"));
const Privacy = lazyWithRetry(() => import("./pages/static/Privacy"));
const Integrations = lazyWithRetry(() => import("./pages/static/Integrations"));
const Roadmap = lazyWithRetry(() => import("./pages/static/Roadmap"));
const Changelog = lazyWithRetry(() => import("./pages/static/Changelog"));
const Blog = lazyWithRetry(() => import("./pages/static/Blog"));
const Careers = lazyWithRetry(() => import("./pages/static/Careers"));
const Terms = lazyWithRetry(() => import("./pages/static/Terms"));
const Security = lazyWithRetry(() => import("./pages/static/Security"));
const DataDeletion = lazyWithRetry(() => import("./pages/static/DataDeletion"));
const Pricing = lazyWithRetry(() => import("./pages/static/Pricing"));

// New Legal/Trust Policies (SEO Phase)
const CookiePolicy = lazyWithRetry(() => import("./pages/policies/CookiePolicy"));
const AIPolicy = lazyWithRetry(() => import("./pages/policies/AIPolicy"));
const AcceptableUse = lazyWithRetry(() => import("./pages/policies/AcceptableUse"));


// Other pages
const PendingDeletionPage = lazyWithRetry(() => import("./pages/PendingDeletionPage"));
const VerifyEmailPage = lazyWithRetry(() => import("./pages/VerifyEmailPage"));
const InstagramToolPage = lazyWithRetry(() => import("./pages/InstagramToolPage"));
const FacebookToolPage = lazyWithRetry(() => import("./pages/FacebookToolPage"));
const YouTubeToolPage = lazyWithRetry(() => import("./pages/YouTubeToolPage"));
const LinkedInToolPage = lazyWithRetry(() => import("./pages/LinkedInToolPage"));
const DealsPipeline = lazyWithRetry(() => import("./pages/DealsPipeline"));
const CustomerPortal = lazyWithRetry(() => import("./pages/CustomerPortal"));
const QualityRatingPage = lazyWithRetry(() => import("./pages/QualityRatingPage"));
const TeamManagementPage = lazyWithRetry(() => import("./pages/TeamManagementPage"));

// Dedicated Enterprise Analytics Pages
const InstagramAnalyticsPage = lazyWithRetry(() => import("./pages/InstagramAnalyticsPage"));
const YouTubeAnalyticsPage = lazyWithRetry(() => import("./pages/YouTubeAnalyticsPage"));
const FacebookAnalyticsPage = lazyWithRetry(() => import("./pages/FacebookAnalyticsPage"));
const WhatsAppAnalyticsPage = lazyWithRetry(() => import("./pages/WhatsAppAnalyticsPage"));

// Centered loading fallback design
const LoadingFallback = () => (
  <div className="h-screen w-full bg-[#030712] flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
  </div>
);

// 🔐 Protected Route
const ProtectedRoute = ({ children, requiredPermission }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  // If deletion is pending, only allow access to the PendingDeletionPage
  if (user?.isDeletionPending) {
    return <PendingDeletionPage />;
  }

  return children;
};

// 🌐 Public Route
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to="/app/dashboard" replace />;
};

export default function App() {
  const { isAuthenticated, fetchUser } = useAuthStore();
  const { fetchBranding } = useBrandingStore();
  const { evaluateFlags } = useFeatureFlagStore();

  useEffect(() => {
    fetchCsrfToken();
    fetchBranding();

    if (!sessionStorage.getItem('render_sleep_notice_shown')) {
      toast("Notice for Reviewers: The first request may take 1 to 1.5 minutes to load as our backend wakes up from sleep.", {
        icon: '⏳',
        duration: 15000,
        style: {
          background: '#374151',
          color: '#fff',
          maxWidth: '500px'
        }
      });
      sessionStorage.setItem('render_sleep_notice_shown', 'true');
    }
  }, [fetchBranding]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
      evaluateFlags();
    }
  }, [isAuthenticated, fetchUser, evaluateFlags]);


  return (
    <HelmetProvider>
      <SEO /> {/* Default Site-wide SEO */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1f2937",
            color: "#f9fafb",
            borderRadius: "10px",
          },
          success: { iconTheme: { primary: "#25D366", secondary: "#fff" } },
        }}
      />
      <CookieConsentModal />
      <TrafficTracker />

      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
          {/* 🌍 HOME (Landing Page) */}
          <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />



          {/* 🔓 Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPasswordPage />
              </PublicRoute>
            }
          />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* 🚀 Auth Callbacks */}
          <Route path="/sso-callback" element={<SsoCallbackPage />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/youtube-callback" element={<YoutubeCallbackPage />} />
          <Route path="/linkedin-callback" element={<LinkedinCallbackPage />} />
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          } />

          {/* ❌ 404 */}
          <Route path="/not-found" element={<NotFound />} />
          
          {/* 🚧 Coming Soon */}
          <Route path="/coming-soon" element={<ComingSoon />} />

          {/* 📄 Static Pages */}
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy-policy" element={<Privacy />} />
          <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
          <Route path="/terms-of-service" element={<Terms />} />
          <Route path="/terms" element={<Navigate to="/terms-of-service" replace />} />
          <Route path="/security" element={<Security />} />
          <Route path="/about-us" element={<About />} />
          <Route path="/about" element={<Navigate to="/about-us" replace />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/data-deletion-policy" element={<DataDeletion />} />
          <Route path="/data-deletion" element={<Navigate to="/data-deletion-policy" replace />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/ai-policy" element={<AIPolicy />} />
          <Route path="/acceptable-use" element={<AcceptableUse />} />

          {/* 🔐 Protected Routes (SHIFTED TO /app) */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="conversations" element={<ConversationsPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="broadcast" element={<BroadcastPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="flow-builder" element={<FlowBuilderPage />} />
            <Route path="keyword-triggers" element={<KeywordTriggersPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="automation" element={<AutomationHubPage />}>
              <Route index element={<Navigate to="instagram" replace />} />
              <Route path="instagram" element={<InstagramToolPage />} />
              <Route path="youtube" element={<YouTubeToolPage />} />
              <Route path="facebook" element={<FacebookToolPage />} />
              <Route path="linkedin" element={<LinkedInToolPage />} />
            </Route>
            {/* <Route path="ai-presenter" element={<AIPresenterPage />} /> */}
            <Route path="leads" element={<LeadsDashboardPage />} />
            <Route path="deals" element={<DealsPipeline />} />
            <Route path="quality" element={<QualityRatingPage />} />
            <Route path="social-hub" element={<SocialPublishingPage />} />

            {/* Platform Analytics Deep-Dives */}
            <Route path="instagram" element={<InstagramAnalyticsPage />} />
            <Route path="youtube" element={<YouTubeAnalyticsPage />} />
            <Route path="facebook" element={<FacebookAnalyticsPage />} />
            <Route path="whatsapp" element={<WhatsAppAnalyticsPage />} />
            <Route path="whatsapp-marketing" element={<WhatsAppMarketingSetup />} />
            
            <Route path="billing" element={<BillingPage />} />
            <Route path="partner-dashboard" element={<SalesPartnerDashboard />} />
            <Route path="team" element={<TeamManagementPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* 🔥 Nested 404 */}
            <Route path="*" element={<Navigate to="/not-found" replace />} />
          </Route>

          <Route path="/portal" element={<CustomerPortal />} />



          {/* 🌍 Global 404 */}
          <Route path="*" element={<Navigate to="/not-found" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
    </BrowserRouter>
    </HelmetProvider>
  );
}

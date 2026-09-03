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

// Lazy-loaded page-level components
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AgentsPage = lazy(() => import("./pages/AgentsPage"));
const ConversationsPage = lazy(() => import("./pages/ConversationsPage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TelegramPage = lazy(() => import("./pages/TelegramPage"));
const InstagramPage = lazy(() => import("./pages/InstagramPage"));
const IntegrationsPage = lazy(() => import("./pages/IntegrationsPage"));
const SocialPublishingPage = lazy(() => import("./pages/SocialPublishingPage"));
const LeadsDashboardPage = lazy(() => import("./pages/LeadsDashboardPage"));
const CallbackPage = lazy(() => import("./pages/CallbackPage"));
const SsoCallbackPage = lazy(() => import("./pages/SsoCallbackPage"));
const WhatsAppSignup = lazy(() => import("./pages/watsapphd"));
const AIPresenterPage = lazy(() => import("./pages/AIPresenterPage"));
const YoutubeCallbackPage = lazy(() => import("./pages/YoutubeCallbackPage"));
const LinkedinCallbackPage = lazy(() => import("./pages/LinkedinCallbackPage"));
const AutomationHubPage = lazy(() => import("./pages/AutomationHubPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Home = lazy(() => import("./pages/Home"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const SalesPartnerDashboard = lazy(() => import("./pages/SalesPartnerDashboard"));

// Phase 8 New Pages
const ContactsPage = lazy(() => import("./pages/ContactsPage"));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage"));
const BroadcastPage = lazy(() => import("./pages/BroadcastPage"));
const CampaignsPage = lazy(() => import("./pages/CampaignsPage"));
const WhatsAppMarketingSetup = lazy(() => import("./pages/WhatsAppMarketingSetup"));
const FlowBuilderPage = lazy(() => import("./pages/FlowBuilderPage"));
const KeywordTriggersPage = lazy(() => import("./pages/KeywordTriggersPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
// Static pages
const About = lazy(() => import("./pages/static/About"));
const Contact = lazy(() => import("./pages/static/Contact"));
const Privacy = lazy(() => import("./pages/static/Privacy"));
const Integrations = lazy(() => import("./pages/static/Integrations"));
const Roadmap = lazy(() => import("./pages/static/Roadmap"));
const Changelog = lazy(() => import("./pages/static/Changelog"));
const Blog = lazy(() => import("./pages/static/Blog"));
const Careers = lazy(() => import("./pages/static/Careers"));
const Terms = lazy(() => import("./pages/static/Terms"));
const Security = lazy(() => import("./pages/static/Security"));
const DataDeletion = lazy(() => import("./pages/static/DataDeletion"));

// New Legal/Trust Policies (SEO Phase)
const CookiePolicy = lazy(() => import("./pages/policies/CookiePolicy"));
const AIPolicy = lazy(() => import("./pages/policies/AIPolicy"));
const AcceptableUse = lazy(() => import("./pages/policies/AcceptableUse"));


// Other pages
const PendingDeletionPage = lazy(() => import("./pages/PendingDeletionPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const InstagramToolPage = lazy(() => import("./pages/InstagramToolPage"));
const FacebookToolPage = lazy(() => import("./pages/FacebookToolPage"));
const YouTubeToolPage = lazy(() => import("./pages/YouTubeToolPage"));
const LinkedInToolPage = lazy(() => import("./pages/LinkedInToolPage"));
const DealsPipeline = lazy(() => import("./pages/DealsPipeline"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const QualityRatingPage = lazy(() => import("./pages/QualityRatingPage"));
const TeamManagementPage = lazy(() => import("./pages/TeamManagementPage"));

// Dedicated Enterprise Analytics Pages
const InstagramAnalyticsPage = lazy(() => import("./pages/InstagramAnalyticsPage"));
const YouTubeAnalyticsPage = lazy(() => import("./pages/YouTubeAnalyticsPage"));
const FacebookAnalyticsPage = lazy(() => import("./pages/FacebookAnalyticsPage"));
const WhatsAppAnalyticsPage = lazy(() => import("./pages/WhatsAppAnalyticsPage"));

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
      <BrowserRouter>
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
          <Route path="/privacy-policy" element={<Privacy />} />
          <Route path="/terms-of-service" element={<Terms />} />
          <Route path="/security" element={<Security />} />
          <Route path="/about-us" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/data-deletion-policy" element={<DataDeletion />} />
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
    </BrowserRouter>
    </HelmetProvider>
  );
}

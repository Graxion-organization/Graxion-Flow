import React, { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Smartphone,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Share2,
  CheckCheck,
  MessageCircle,
  AlertTriangle,
  Info,
  Target,
  Sparkles,
  Moon,
  SunMedium,
  Video,
  Briefcase,
  ShieldCheck,
  Building2,
  Plus,
  Users,
  Megaphone,
  Workflow,
  BarChart3,
  Database,
  PlayCircle,
  Zap,
  FileText,
  Shield,
  Trash2,
  DollarSign
} from "lucide-react";
import { io } from "socket.io-client";
import { useAuthStore, useNotificationStore, useOrganizationStore, useBrandingStore } from "../../store";
import { notificationAPI, socialHubAPI, authAPI } from "../../services/api";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import OrganizationSwitcher from "./OrganizationSwitcher";
import OnboardingGateway from "./OnboardingGateway";
import { useTranslation } from "react-i18next";

const SIDEBAR_GROUPS = [
  {
    title: "Workspace",
    items: [
      { to: "/app/dashboard", icon: LayoutDashboard, label: "Home", minRole: "viewer" },
      { to: "/app/analytics", icon: BarChart3, label: "Analytics", minRole: "viewer" },
    ]
  },
  {
    title: "AI Automation",
    items: [
      { to: "/app/agents", icon: Bot, label: "My AI Team", minRole: "admin" },
      { to: "/app/flow-builder", icon: Workflow, label: "Flow Builder", minRole: "admin" },
      { to: "/app/templates", icon: Database, label: "Knowledge Base", minRole: "admin" },
    ]
  },
  {
    title: "Messaging",
    items: [
      { to: "/app/conversations", icon: MessageSquare, label: "Inbox", minRole: "viewer" },
      { to: "/app/quality", icon: ShieldCheck, label: "Meta Quality", minRole: "admin" },
    ]
  },
  {
    title: "CRM & Sales",
    items: [
      { to: "/app/contacts", icon: Users, label: "Customers", minRole: "viewer" },
      { to: "/app/deals", icon: Briefcase, label: "Deals Pipeline", minRole: "viewer" },
      { to: "/app/leads", icon: Target, label: "Leads", minRole: "viewer" },
    ]
  },
  {
    title: "Marketing",
    items: [
      { to: "/app/campaigns", icon: Megaphone, label: "Campaigns", minRole: "editor" },
      { to: "/app/broadcast", icon: PlayCircle, label: "Broadcasts", minRole: "editor" },
      { to: "/app/social-hub", icon: Share2, label: "Social Hub", minRole: "editor" },
      { to: "/app/automation/instagram", icon: MessageCircle, label: "Auto Comments", minRole: "editor" },
    ]
  },
  {
    title: "Administration",
    items: [
      { to: "/app/integrations", icon: Smartphone, label: "App Store", minRole: "admin" },
      { to: "/app/partner-dashboard", icon: DollarSign, label: "Sales Partner", minRole: "sales_partner" },
      { to: "/app/settings", icon: Settings, label: "Settings", minRole: "viewer" },
      { to: "/app/billing", icon: CreditCard, label: "Billing & Plans", minRole: "viewer" },
    ]
  }
];

const notifTypeIcon = {
  new_message: <MessageCircle size={14} />,
  human_handoff: <AlertTriangle size={14} />,
  system: <Info size={14} />,
};

function NotificationItem({ notif, onNavigate, isDark }) {
  const timeAgo = notif.timestamp
    ? formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })
    : "";

  const typeColor = {
    new_message: isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700",
    human_handoff: isDark ? "bg-rose-500/20 text-rose-300" : "bg-rose-100 text-rose-700",
    system: isDark ? "bg-sky-500/20 text-sky-300" : "bg-sky-100 text-sky-700",
  };

  return (
    <button
      onClick={() => onNavigate(notif)}
      className={`w-full text-left px-4 py-3.5 flex gap-3 border-b transition-colors ${
        isDark
          ? `border-white/5 hover:bg-white/5 ${!notif.read ? "bg-white/5" : ""}`
          : `border-slate-100 hover:bg-slate-50 ${!notif.read ? "bg-orange-50/60" : ""}`
      }`}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${typeColor[notif.type] || (isDark ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600")}`}>
        {notifTypeIcon[notif.type] || <Info size={14} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-semibold truncate ${isDark ? "text-slate-100" : "text-slate-800"}`}>{notif.title}</p>
          {!notif.read && <span className="w-2 h-2 bg-[#FF6A00] rounded-full shrink-0 mt-1" />}
        </div>
        <p className={`text-xs mt-0.5 line-clamp-2 leading-relaxed ${isDark ? "text-slate-300" : "text-slate-500"}`}>{notif.message}</p>
        <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-400"}`}>{timeAgo}</span>
      </div>
    </button>
  );
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [socialConnectedCount, setSocialConnectedCount] = useState(0);
  const [onboardingStatus, setOnboardingStatus] = useState({ isCompleted: true, hasIntegration: false, hasAgent: false });
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(true);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    return stored !== null ? stored === "true" : false;
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const { user, logout } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const { branding } = useBrandingStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  useEffect(() => {
    if (location.pathname.includes("/social-hub")) {
      socialHubAPI.getAccounts().then((res) => {
        const data = res.data?.data || [];
        const filteredData = data.filter(acc => acc.platform !== 'whatsapp' && acc.platform !== 'telegram');
        setSocialConnectedCount(filteredData.length);
      }).catch(() => {});
    }
  }, [location.pathname]);

  const {
    notifications,
    unreadCount,
    setFromAPI,
    addNotification,
    markRead,
    markAllRead,
  } = useNotificationStore();

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const res = await authAPI.getOnboardingStatus();
        if (res.data?.data) {
          setOnboardingStatus(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch onboarding status', err);
      } finally {
        setIsOnboardingLoading(false);
      }
    };
    if (currentOrganization) {
      checkOnboarding();
    } else {
      setIsOnboardingLoading(false);
    }
  }, [currentOrganization, location.pathname]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("app-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);
    window.dispatchEvent(new CustomEvent("app-theme-change", { detail: { theme } }));
  }, [theme]);

  // Handle automatic organization creation if user has none
  const { organizations, addOrganization, setCurrentOrganization: setGlobalCurrentOrg } = useOrganizationStore();
  const [isAutoCreating, setIsAutoCreating] = useState(false);

  useEffect(() => {
    const handleAutoCreate = async () => {
      // If we've already loaded and there are 0 orgs
      if (organizations.length === 0 && !currentOrganization && !isAutoCreating) {
        setIsAutoCreating(true);
        try {
          // Check if it's not just a momentary glitch by fetching
          const { organizationAPI } = require('../../services/api');
          const res = await organizationAPI.getAll();
          const orgs = res.data?.data?.organizations || [];
          
          if (orgs.length === 0) {
            // Truly no orgs - create one automatically
            toast.loading('Setting up your default workspace...', { id: 'org-setup' });
            const createRes = await organizationAPI.create({ name: `${user?.name || 'My'}'s Workspace` });
            const newOrg = createRes.data?.data?.organization;
            if (newOrg) {
              addOrganization(newOrg);
              setGlobalCurrentOrg(newOrg);
              toast.success('Workspace created successfully!', { id: 'org-setup' });
            }
          } else {
            // Found orgs, just set the first one
            setGlobalCurrentOrg(orgs[0]);
          }
        } catch (err) {
          toast.dismiss('org-setup');
          // Only show error if it's not a 400 org required error
        } finally {
          setIsAutoCreating(false);
        }
      }
    };
    
    if (user && !currentOrganization) {
      handleAutoCreate();
    }
  }, [organizations, currentOrganization, user, addOrganization, setGlobalCurrentOrg, isAutoCreating]);

  const isDark = theme === "dark";

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const plan = user?.subscription?.plan || "free";
  const usedMessages = user?.usage?.messagesThisMonth || 0;
  const limitMessages = user?.subscription?.messageLimit || 100;
  const usagePercent = Math.min((usedMessages / limitMessages) * 100, 100);

  // Determine user role in current organization
  const roleLevels = { owner: 4, admin: 3, editor: 2, viewer: 1 };
  let currentRole = "viewer";
  if (currentOrganization) {
    if (currentOrganization.owner === user?._id) {
      currentRole = "owner";
    } else {
      const member = currentOrganization.members?.find(m => m.user === user?._id || m.user?._id === user?._id);
      if (member) currentRole = member.role;
    }
  }

  const filteredGroups = SIDEBAR_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      const requiredLevel = roleLevels[item.minRole] || 1;
      const userLevel = roleLevels[currentRole] || 1;
      if (userLevel < requiredLevel) return false;
      
      if (!onboardingStatus.isCompleted && !['/app/integrations', '/app/agents', '/app/settings', '/app/billing'].includes(item.to)) {
        return false;
      }
      return true;
    })
  })).filter(group => group.items.length > 0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await notificationAPI.getAll();
        setFromAPI(res.data.data);
      } catch {
        // silent
      }
    };
    load();
  }, [setFromAPI]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socketUrl = process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace("/api", "")
      : "http://localhost:5000";

    const socket = io(socketUrl, { auth: { token }, transports: ["websocket"] });

    socket.on("new_notification", (notif) => {
      addNotification(notif);
      toast(notif.title, {
        icon: notif.type === "human_handoff" ? "!" : "•",
        duration: 3500,
        style: { fontSize: "13px" },
      });
    });

    return () => socket.disconnect();
  }, [addNotification]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleNotifNavigate = useCallback(
    async (notif) => {
      markRead(notif.id);
      if (notif.conversationId) {
        notificationAPI.markRead([notif.conversationId]).catch(() => {});
      }
      setNotifOpen(false);
      navigate(notif.conversationId ? `/app/conversations?conv=${notif.conversationId}` : "/app/conversations");
    },
    [markRead, navigate]
  );

  const handleMarkAllRead = useCallback(async () => {
    markAllRead();
    try {
      await notificationAPI.markAllRead();
    } catch {
      // silent
    }
  }, [markAllRead]);

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  const allFilteredItems = filteredGroups.flatMap(g => g.items);
  const pageTitle = allFilteredItems.find((item) => location.pathname.startsWith(item.to))?.label || "Workspace";

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"}`}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-40 transform transition-all duration-300 ease-out flex flex-col ${
          isSidebarCollapsed ? "w-[80px]" : "w-72"
        } ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isDark ? "bg-slate-900 border-r border-white/10" : "bg-white border-r border-slate-200"}`}
      >
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`hidden lg:flex absolute -right-3 bottom-10 items-center justify-center w-6 h-6 rounded-full border shadow-sm z-50 transition-colors ${
            isDark 
              ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700" 
              : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
        </button>

        <div className="h-full flex flex-col">
          <div className={`p-5 border-b flex justify-center ${isDark ? "border-white/10" : "border-slate-200"}`}>
            <div className="flex items-center justify-between w-full">
              <div className={`flex items-center min-w-0 ${isSidebarCollapsed ? 'justify-center w-full' : 'gap-3'}`}>
                {branding.branding_logo_url ? (
                  <img src={branding.branding_logo_url} alt={branding.branding_site_name} className={`h-10 object-contain rounded-lg ${isSidebarCollapsed ? 'max-w-[40px]' : 'max-w-[140px]'}`} />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/30 shrink-0">
                    <MessageSquare size={19} className="text-white" />
                  </div>
                )}
                {!isSidebarCollapsed && (
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Control Room</p>
                    <p className="font-semibold truncate">{branding.branding_site_name}</p>
                  </div>
                )}
              </div>
              {!isSidebarCollapsed && (
                <button onClick={() => setSidebarOpen(false)} className={`lg:hidden p-2 rounded-lg ${isDark ? "hover:bg-white/10" : "hover:bg-slate-100"}`}>
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="px-4 pt-4">
            {!isSidebarCollapsed ? (
              <OrganizationSwitcher isDark={isDark} primaryColor="#FF6A00" />
            ) : (
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-bold" title="Current Workspace">
                  {branding.branding_site_name?.[0]?.toUpperCase() || 'W'}
                </div>
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar pb-10">
            {filteredGroups.map((group, idx) => (
              <div key={idx} className="space-y-1">
                {!isSidebarCollapsed && (
                  <p className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em]">
                    {group.title}
                  </p>
                )}
                {group.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    title={isSidebarCollapsed ? label : undefined}
                    className={({ isActive }) =>
                      `group flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-accent/10 text-accent font-semibold"
                          : isDark
                          ? "text-slate-300 hover:text-white hover:bg-white/8"
                          : "text-text/70 hover:text-text hover:bg-surface"
                      }`
                    }
                  >
                    <Icon size={isSidebarCollapsed ? 22 : 18} />
                    {!isSidebarCollapsed && <span>{t(`nav.${label.toLowerCase().replace(/ /g, '')}`, label)}</span>}
                  </NavLink>
                ))}
              </div>
            ))}

            {user?.role === "admin" && (
              <div className={`mt-4 pt-4 border-t ${isDark ? "border-white/10" : "border-border"}`}>
                {!isSidebarCollapsed && <p className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.16em]">Platform</p>}
                <NavLink
                  to="/admin/dashboard"
                  onClick={() => setSidebarOpen(false)}
                  title={isSidebarCollapsed ? "Admin Panel" : undefined}
                  className={({ isActive }) =>
                    `flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-accent/10 text-accent font-semibold"
                        : isDark
                        ? "text-orange-300 hover:text-orange-100 hover:bg-orange-500/10"
                        : "text-text/70 hover:text-text hover:bg-surface"
                    }`
                  }
                >
                  <LayoutDashboard size={isSidebarCollapsed ? 22 : 18} />
                  {!isSidebarCollapsed && "Admin Panel"}
                </NavLink>
              </div>
            )}
          </nav>

          {!isSidebarCollapsed && (
            <div className={`p-4 border-t ${isDark ? "border-white/10" : "border-slate-200"}`}>
              <div className={`rounded-2xl p-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">Monthly usage</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${isDark ? "bg-white/10 text-slate-200" : "bg-slate-200 text-slate-700"}`}>
                    {plan}
                  </span>
                </div>
                <div className="flex justify-between text-xs mb-2 text-slate-400">
                  <span>{usedMessages.toLocaleString()}</span>
                  <span>{limitMessages.toLocaleString()}</span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-slate-200"}`}>
                  <div className="h-full rounded-full transition-all duration-500 bg-accent" style={{ width: `${usagePercent}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className={`relative z-30 px-4 lg:px-7 py-4 border-b backdrop-blur-xl ${isDark ? "bg-slate-950/70 border-white/10" : "bg-white/85 border-slate-200"}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className={`lg:hidden p-2 rounded-xl ${isDark ? "hover:bg-white/10" : "hover:bg-slate-100"}`}>
              <Menu size={18} />
            </button>

            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Navigation</p>
              <h1 className="text-lg font-semibold leading-tight truncate">{pageTitle}</h1>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {location.pathname.includes("/social-hub") && (
                <div className="hidden sm:flex items-center gap-3 mr-2">
                  {user?.subscription && (
                    <div className="px-2.5 py-1 bg-warning/10 text-warning rounded-full border border-warning/20 text-[10px] font-bold flex items-center gap-1.5">
                      <Zap size={12} className="fill-warning" />
                      <span>{Math.max(0, user.subscription.credits ?? 0).toLocaleString()} Credits</span>
                    </div>
                  )}
                  <div className="px-2.5 py-1 bg-success/10 text-success rounded-full border border-success/20 text-[10px] font-semibold flex items-center gap-1.5">
                    <ShieldCheck size={12} />
                    {socialConnectedCount} Connected
                  </div>
                </div>
              )}

              <button
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                className={`p-2.5 rounded-xl transition-all ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}
                aria-label="Toggle theme"
              >
                {isDark ? <SunMedium size={17} /> : <Moon size={17} />}
              </button>

              <button
                onClick={toggleLanguage}
                className={`p-2.5 rounded-xl transition-colors flex items-center justify-center min-w-[38px] ${
                  isDark
                    ? "hover:bg-white/10 text-slate-300 hover:text-white"
                    : "hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                }`}
                title="Toggle Language"
              >
                <span className="text-sm font-bold uppercase">{i18n.language}</span>
              </button>

              <div className="relative" ref={notifRef}>
                <button onClick={() => setNotifOpen((o) => !o)} className={`relative p-2.5 rounded-xl transition-colors ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>
                  <Bell size={18} className={unreadCount > 0 ? "text-accent" : ""} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className={`absolute right-4 sm:right-0 top-12 w-[calc(100vw-2rem)] sm:w-[360px] max-h-[480px] rounded-2xl border z-50 flex flex-col overflow-hidden nav-fade-up ${isDark ? "bg-slate-900 border-white/10 shadow-2xl shadow-black/40" : "bg-white border-slate-200 shadow-2xl shadow-slate-300/40"}`}>
                    <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-white/10" : "border-slate-100"}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">Notifications</span>
                        {unreadCount > 0 && <span className="bg-[#FF6A00]/15 text-[#FF6A00] text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount} new</span>}
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-[11px] text-[#FF6A00] font-medium">
                          <CheckCheck size={13} />
                          Mark all
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center py-12 ${isDark ? "text-slate-400" : "text-slate-400"}`}>
                          <Bell size={30} className="mb-2 opacity-40" />
                          <p className="text-sm font-medium">No notifications</p>
                        </div>
                      ) : (
                        <>
                          {unread.length > 0 && <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Unread</p>}
                          {unread.map((n) => (
                            <NotificationItem key={n.id} notif={n} onNavigate={handleNotifNavigate} isDark={isDark} />
                          ))}

                          {read.length > 0 && <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Earlier</p>}
                          {read.map((n) => (
                            <NotificationItem key={n.id} notif={n} onNavigate={handleNotifNavigate} isDark={isDark} />
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className={`flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl transition-colors ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}
                >
                  <div className="w-8 h-8 rounded-xl bg-[#FF6A00]/20 text-[#FF6A00] flex items-center justify-center text-sm font-semibold">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">{user?.name}</span>
                  <ChevronDown size={15} className="text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div className={`absolute right-0 top-12 w-56 rounded-2xl border py-1.5 z-50 nav-fade-up ${isDark ? "bg-slate-900 border-white/10 shadow-2xl shadow-black/40" : "bg-white border-slate-200 shadow-2xl shadow-slate-300/40"}`}>
                    <div className={`px-4 py-2 border-b ${isDark ? "border-white/10" : "border-slate-100"}`}>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    </div>

                    <div className={`py-1 border-b ${isDark ? "border-white/10" : "border-slate-100"}`}>
                      {(user?.role === 'sales_partner' || user?.role === 'admin' || user?.role === 'superadmin') && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/app/partner-dashboard");
                          }}
                          className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-emerald-400 font-semibold ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}
                        >
                          <DollarSign size={15} /> Sales Partner Panel
                        </button>
                      )}
                      {(user?.role === 'admin' || user?.role === 'superadmin') && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/admin/dashboard");
                          }}
                          className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-purple-400 font-semibold ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}
                        >
                          <Shield size={15} /> Admin Panel
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate("/app/team");
                        }}
                        className={`flex items-center gap-2 w-full px-4 py-2 text-sm ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}
                      >
                        <Users size={15} /> Team Management
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate("/app/settings");
                        }}
                        className={`flex items-center gap-2 w-full px-4 py-2 text-sm ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}
                      >
                        <Settings size={15} /> Settings
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate("/app/billing");
                        }}
                        className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-[#FF6A00] ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}
                      >
                        <CreditCard size={15} /> Billing & Plans
                      </button>
                    </div>

                    <div className={`py-1.5 flex justify-center gap-3 border-b ${isDark ? "border-white/10" : "border-slate-100"}`}>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          window.open("/terms-of-service", "_blank");
                        }}
                        className={`text-[11px] font-medium transition-colors ${isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        Terms
                      </button>
                      <span className={`text-[11px] ${isDark ? "text-slate-700" : "text-slate-300"}`}>•</span>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          window.open("/privacy-policy", "_blank");
                        }}
                        className={`text-[11px] font-medium transition-colors ${isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        Privacy
                      </button>
                      <span className={`text-[11px] ${isDark ? "text-slate-700" : "text-slate-300"}`}>•</span>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          window.open("/data-deletion-policy", "_blank");
                        }}
                        className={`text-[11px] font-medium transition-colors ${isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        Data Deletion
                      </button>
                    </div>

                    <button onClick={handleLogout} className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm text-rose-500 ${isDark ? "hover:bg-rose-500/10" : "hover:bg-rose-50"}`}>
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 lg:px-7 py-5">
          <div className="nav-fade-up h-full">
            {!currentOrganization ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
                <div className={`p-8 rounded-3xl max-w-md w-full border text-center shadow-xl ${isDark ? 'bg-slate-900 border-white/10 shadow-black/40' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    {isAutoCreating ? (
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6A00]"></div>
                    ) : (
                       <Building2 size={32} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold mb-3">{isAutoCreating ? 'Setting up...' : 'Workspace Required'}</h2>
                  <p className={`mb-8 text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isAutoCreating 
                      ? "We are automatically setting up your default workspace. Please wait a moment..." 
                      : "You need an active workspace to use the platform's features. Please create your first workspace using the sidebar menu to get started."}
                  </p>
                  {!isAutoCreating && (
                    <div className="inline-flex items-center justify-center gap-2 text-sm font-bold text-[#FF6A00] bg-[#FF6A00]/10 px-6 py-3 rounded-xl border border-[#FF6A00]/20">
                      <Plus size={18} />
                      <span>Click "Create New Workspace" in Sidebar</span>
                    </div>
                  )}
                </div>
              </div>
            ) : isOnboardingLoading ? (
              <div className="flex h-full items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : !onboardingStatus.isCompleted && !['/app/integrations', '/app/agents', '/app/settings', '/app/billing'].some(p => location.pathname.startsWith(p)) ? (
              <OnboardingGateway status={onboardingStatus} isDark={isDark} />
            ) : (
              <Outlet key={currentOrganization._id} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}



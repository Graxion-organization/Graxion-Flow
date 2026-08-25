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
  DollarSign,
  Search,
  Server
} from "lucide-react";
import { getSocket } from "../../utils/socket";
import { useAuthStore, useNotificationStore, useOrganizationStore, useBrandingStore } from "../../store";
import { notificationAPI, socialHubAPI, authAPI, organizationAPI } from "../../services/api";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import OrganizationSwitcher from "./OrganizationSwitcher";
import OnboardingGateway from "./OnboardingGateway";
import { useTranslation } from "react-i18next";

// "Sunte Hi Pata Chal Jaye" - Intuitive Sidebar Grouping
const SIDEBAR_GROUPS = [
  {
    title: "Overview",
    items: [
      { to: "/app/dashboard", icon: LayoutDashboard, label: "Home", minRole: "viewer" },
      { to: "/app/analytics", icon: BarChart3, label: "Analytics", minRole: "viewer" },
    ]
  },
  {
    title: "Inbox & Chats",
    items: [
      { to: "/app/conversations", icon: MessageSquare, label: "Live Inbox", minRole: "viewer" },
    ]
  },
  {
    title: "Customers & CRM",
    items: [
      { to: "/app/contacts", icon: Users, label: "Customers", minRole: "viewer" },
      { to: "/app/deals", icon: Briefcase, label: "Deals Pipeline", minRole: "viewer" },
      { to: "/app/leads", icon: Target, label: "Leads", minRole: "viewer" },
    ]
  },
  {
    title: "Bulk Messaging",
    items: [
      { to: "/app/broadcast", icon: PlayCircle, label: "Broadcasts", minRole: "editor" },
      { to: "/app/campaigns", icon: Megaphone, label: "Campaigns", minRole: "editor" },
      { to: "/app/templates", icon: FileText, label: "Templates", minRole: "admin" },
    ]
  },
  {
    title: "AI & Automations",
    items: [
      { to: "/app/agents", icon: Bot, label: "My AI Team", minRole: "admin" },
      { to: "/app/keyword-triggers", icon: Zap, label: "Auto-Replies", minRole: "admin" },
      { to: "/app/flow-builder", icon: Workflow, label: "Chat Flows", minRole: "admin" },
    ]
  },
  {
    title: "Social Media",
    items: [
      { to: "/app/social-hub", icon: Share2, label: "Social Hub", minRole: "editor" },
      { to: "/app/automation/instagram", icon: MessageCircle, label: "Auto Comments", minRole: "editor" },
    ]
  },
  {
    title: "Connections",
    items: [
      { to: "/app/integrations", icon: Smartphone, label: "App Store", minRole: "admin" },
      { to: "/app/quality", icon: ShieldCheck, label: "Meta Quality", minRole: "admin" },
    ]
  },
  {
    title: "Administration",
    items: [
      { to: "/app/partner-dashboard", icon: DollarSign, label: "Sales Partner", minRole: "sales_partner" },
      { to: "/app/settings", icon: Settings, label: "Settings", minRole: "viewer" },
      { to: "/app/billing", icon: CreditCard, label: "Billing", minRole: "viewer" },
    ]
  }
];

const notifTypeIcon = {
  new_message: <MessageCircle size={14} />,
  human_handoff: <AlertTriangle size={14} />,
  system: <Info size={14} />,
};

function NotificationItem({ notif, onNavigate, isDark }) {
  const timeAgo = notif.timestamp ? formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true }) : "";
  const typeColor = {
    new_message: isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700",
    human_handoff: isDark ? "bg-rose-500/20 text-rose-300" : "bg-rose-100 text-rose-700",
    system: isDark ? "bg-sky-500/20 text-sky-300" : "bg-sky-100 text-sky-700",
  };

  return (
    <button
      onClick={() => onNavigate(notif)}
      className={`w-full text-left px-4 py-3.5 flex gap-3 border-b transition-colors ${
        isDark ? `border-white/5 hover:bg-white/5 ${!notif.read ? "bg-white/5" : ""}` : `border-slate-100 hover:bg-slate-50 ${!notif.read ? "bg-[#FF6A00]/10" : ""}`
      }`}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${typeColor[notif.type] || (isDark ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600")}`}>
        {notifTypeIcon[notif.type] || <Info size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-semibold truncate ${isDark ? "text-slate-100" : "text-slate-800"}`}>{notif.title}</p>
          {!notif.read && <span className="w-2 h-2 bg-[#FF6A00] rounded-full shrink-0 mt-1 shadow-[0_0_8px_rgba(255,106,0,0.6)]" />}
        </div>
        <p className={`text-xs mt-0.5 line-clamp-2 leading-relaxed ${isDark ? "text-slate-300" : "text-slate-500"}`}>{notif.message}</p>
        <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-400"}`}>{timeAgo}</span>
      </div>
    </button>
  );
}

const SubscriptionBanner = () => {
  const { user, isDark } = useAuth();
  const navigate = useNavigate();

  if (!user?.subscription) return null;
  if (user.subscription.plan === 'free') return null;
  
  const isPastDue = user.subscription.status === 'past_due';
  const end = user.subscription.currentPeriodEnd;
  const endMs = end ? new Date(end).getTime() : 0;
  const nowMs = Date.now();
  const timeDiff = endMs - nowMs;
  
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  const isExpired = isPastDue || (end && timeDiff <= 0);

  if (isExpired) {
    return (
      <div className="w-full px-4 py-2.5 bg-rose-600 border-b border-rose-700 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 z-50">
        <div className="flex items-center gap-2 text-white">
          <AlertTriangle size={16} />
          <span className="text-xs font-semibold">Subscription Expired! Your workspaces and agents are disabled.</span>
        </div>
        <button onClick={() => navigate('/app/billing')} className="px-4 py-1.5 bg-white text-rose-600 rounded-md text-[11px] font-bold hover:bg-rose-50 transition-colors shadow-sm">
          Renew Now
        </button>
      </div>
    );
  }

  if (daysRemaining <= 1) {
    return (
      <div className="w-full px-4 py-2.5 bg-red-500 border-b border-red-600 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 z-50">
        <div className="flex items-center gap-2 text-white">
          <AlertTriangle size={16} />
          <span className="text-xs font-semibold">Critical: Subscription expires in less than 24 hours.</span>
        </div>
        <button onClick={() => navigate('/app/billing')} className="px-4 py-1.5 bg-white text-red-600 rounded-md text-[11px] font-bold hover:bg-red-50 transition-colors shadow-sm">
          Update Billing
        </button>
      </div>
    );
  }
  
  if (daysRemaining <= 3) {
    return (
      <div className="w-full px-4 py-2 bg-amber-500 border-b border-amber-600 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 z-50">
        <div className="flex items-center gap-2 text-white">
          <Info size={16} />
          <span className="text-xs font-semibold">Your plan expires in {daysRemaining} days. Renew early to prevent automation pauses.</span>
        </div>
        <button onClick={() => navigate('/app/billing')} className="px-4 py-1 bg-white text-amber-600 rounded-md text-[11px] font-bold hover:bg-amber-50 transition-colors shadow-sm">
          Renew Plan
        </button>
      </div>
    );
  }
  
  if (daysRemaining <= 7) {
    return (
      <div className={`w-full px-4 py-2 border-b flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 z-50 ${isDark ? 'bg-orange-500/20 border-orange-500/30 text-orange-200' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
        <div className="flex items-center gap-2">
          <Info size={16} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
          <span className="text-xs font-semibold">Your plan expires in {daysRemaining} days.</span>
        </div>
        <button onClick={() => navigate('/app/billing')} className={`px-4 py-1 rounded-md text-[11px] font-bold transition-colors shadow-sm ${isDark ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-orange-100 text-orange-800 hover:bg-orange-200'}`}>
          Billing Details
        </button>
      </div>
    );
  }
  
  return null;
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
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
  const quickActionRef = useRef(null);
  const { user, logout, fetchUser } = useAuthStore();
  const { currentOrganization, organizations, addOrganization, setCurrentOrganization: setGlobalCurrentOrg } = useOrganizationStore();
  const { branding, fetchBranding } = useBrandingStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  
  // Dynamically fetch fresh branding/sidebar settings every time dashboard loads
  useEffect(() => {
    fetchBranding().catch(() => {});
  }, [fetchBranding]);

  // Sync usage limits and user profile dynamically across navigation
  useEffect(() => {
    fetchUser().catch(() => {});
  }, [fetchUser, location.pathname]);

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

  const { notifications, unreadCount, setFromAPI, addNotification, markRead, markAllRead } = useNotificationStore();

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
    if (currentOrganization) checkOnboarding();
    else setIsOnboardingLoading(false);
  }, [currentOrganization, location.pathname]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("app-theme");
    if (storedTheme === "light" || storedTheme === "dark") setTheme(storedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);
    window.dispatchEvent(new CustomEvent("app-theme-change", { detail: { theme } }));
  }, [theme]);

  const [isAutoCreating, setIsAutoCreating] = useState(false);
  useEffect(() => {
    const handleAutoCreate = async () => {
      if (organizations.length === 0 && !currentOrganization && !isAutoCreating) {
        setIsAutoCreating(true);
        try {
          const res = await organizationAPI.getAll();
          const orgs = res.data?.data?.organizations || [];
          if (orgs.length === 0) {
            toast.loading('Setting up your workspace...', { id: 'org-setup' });
            const createRes = await organizationAPI.create({ name: `${user?.name || 'My'}'s Workspace` });
            const newOrg = createRes.data?.data?.organization;
            if (newOrg) {
              addOrganization(newOrg);
              setGlobalCurrentOrg(newOrg);
              toast.success('Workspace created successfully!', { id: 'org-setup' });
            }
          } else {
            setGlobalCurrentOrg(orgs[0]);
          }
        } catch (err) {
          toast.dismiss('org-setup');
        } finally {
          setIsAutoCreating(false);
        }
      }
    };
    if (user && !currentOrganization) handleAutoCreate();
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

  const roleLevels = { owner: 4, admin: 3, editor: 2, viewer: 1 };
  let currentRole = "viewer";
  if (currentOrganization) {
    if (currentOrganization.owner === user?._id) currentRole = "owner";
    else {
      const member = currentOrganization.members?.find(m => m.user === user?._id || m.user?._id === user?._id);
      if (member) currentRole = member.role;
    }
  }

  const filteredGroups = SIDEBAR_GROUPS.map(group => {
    const mappedItems = group.items.map(item => {
      let isGloballyDisabled = false;
      // Custom sidebar branding toggle hide check
      if (branding?.sidebar_settings) {
        const mapping = {
          "Home": "Overview",
          "Analytics": "Analytics",
          "Live Inbox": "Live Inbox",
          "Customers": "Customers",
          "Deals Pipeline": "Deals Pipeline",
          "Leads": "Leads",
          "Broadcasts": "Broadcasts",
          "Campaigns": "Campaigns",
          "Templates": "Templates",
          "My AI Team": "My AI Team",
          "Auto-Replies": "Auto-Replies",
          "Chat Flows": "Chat Flows",
          "Social Hub": "Social Hub",
          "Auto Comments": "Auto Comments",
          "App Store": "App Store",
          "Meta Quality": "Meta Quality",
          "Sales Partner": "Sales Partner",
          "Settings": "Settings",
          "Billing": "Billing"
        };
        const toggleKey = mapping[item.label];
        if (toggleKey && branding.sidebar_settings[toggleKey] === false) {
          isGloballyDisabled = true;
        }
      }
      return { ...item, isGloballyDisabled };
    });

    const visibleItems = mappedItems.filter(item => {
      // Feature Toggle Check - Unconditionally hide if disabled globally via Admin Panel
      if (item.isGloballyDisabled) {
        return false;
      }

      const requiredLevel = roleLevels[item.minRole] || 1;
      const userLevel = roleLevels[currentRole] || 1;
      if (userLevel < requiredLevel) return false;
      
      
      return true;
    });

    return {
      ...group,
      items: visibleItems
    };
  }).filter(group => group.items.length > 0);

  // Route Blocking for Disabled Sections
  useEffect(() => {
    const currentPath = location.pathname;
    let isDisabled = false;
    
    SIDEBAR_GROUPS.forEach(group => {
      group.items.forEach(item => {
        if (item.to === currentPath) {
          if (branding?.sidebar_settings) {
            const mapping = {
              "Home": "Overview",
              "Analytics": "Analytics",
              "Live Inbox": "Live Inbox",
              "Customers": "Customers",
              "Deals Pipeline": "Deals Pipeline",
              "Leads": "Leads",
              "Broadcasts": "Broadcasts",
              "Campaigns": "Campaigns",
              "Templates": "Templates",
              "My AI Team": "My AI Team",
              "Auto-Replies": "Auto-Replies",
              "Chat Flows": "Chat Flows",
              "Social Hub": "Social Hub",
              "Auto Comments": "Auto Comments",
              "App Store": "App Store",
              "Meta Quality": "Meta Quality",
              "Sales Partner": "Sales Partner",
              "Settings": "Settings",
              "Billing": "Billing"
            };
            const toggleKey = mapping[item.label];
            if (toggleKey && branding.sidebar_settings[toggleKey] === false) {
              isDisabled = true;
            }
          }
        }
      });
    });

    if (isDisabled) {
      toast.error("This section is currently disabled");
      navigate('/app/dashboard', { replace: true });
    }
  }, [location.pathname, branding, navigate]);
  useEffect(() => {
    const load = async () => {
      try {
        const res = await notificationAPI.getAll();
        setFromAPI(res.data.data);
      } catch {}
    };
    load();
  }, [setFromAPI]);

  useEffect(() => {
    const socket = getSocket();

    const handleNewNotification = (notif) => {
      addNotification(notif);
      toast(notif.title, { icon: notif.type === "human_handoff" ? "!" : "•", duration: 3500, style: { fontSize: "13px" } });
    };

    socket.on("new_notification", handleNewNotification);
    
    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [addNotification]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (quickActionRef.current && !quickActionRef.current.contains(e.target)) setQuickActionOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleNotifNavigate = useCallback(async (notif) => {
    markRead(notif.id);
    if (notif.conversationId) notificationAPI.markRead([notif.conversationId]).catch(() => {});
    setNotifOpen(false);
    navigate(notif.conversationId ? `/app/conversations?conv=${notif.conversationId}` : "/app/conversations");
  }, [markRead, navigate]);

  const handleMarkAllRead = useCallback(async () => {
    markAllRead();
    try { await notificationAPI.markAllRead(); } catch {}
  }, [markAllRead]);

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);
  const allFilteredItems = filteredGroups.flatMap(g => g.items);
  const pageTitle = allFilteredItems.find((item) => location.pathname.startsWith(item.to))?.label || "Workspace";

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${isDark ? "bg-[#0b101e] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-40 transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col ${
          isSidebarCollapsed ? "w-[80px]" : "w-72"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${
          isDark ? "bg-[#111827]/95 border-r border-white/5 backdrop-blur-xl" : "bg-white/95 border-r border-slate-200/80 backdrop-blur-xl"
        }`}
      >
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`hidden lg:flex absolute -right-3 top-8 items-center justify-center w-6 h-6 rounded-full shadow-sm z-50 transition-colors duration-200 border ${
            isDark ? "bg-[#1f2937] border-white/10 text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900"
          }`}
        >
          {isSidebarCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
        </button>

        <div className="h-full flex flex-col">
          <div className={`p-5 border-b transition-colors ${isDark ? "border-white/5" : "border-slate-100"}`}>
            <div className="flex items-center justify-between w-full">
              <div className={`flex items-center min-w-0 ${isSidebarCollapsed ? 'justify-center w-full' : 'gap-3'}`}>
                <img src="https://res.cloudinary.com/dh6uiegxw/image/upload/v1784957805/social_hub/qth6s6bzkoawy0q1qprl.png" alt="Graxion Flow Logo" className={`h-9 object-contain rounded-lg transition-all ${isSidebarCollapsed ? 'w-8' : 'w-auto max-w-[140px]'}`} />
                {!isSidebarCollapsed && (
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold">Workspace</p>
                    <p className="font-semibold text-sm truncate tracking-tight">{branding.branding_site_name}</p>
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

          <div className="px-3 pt-4 pb-2">
            {!isSidebarCollapsed ? (
              <OrganizationSwitcher isDark={isDark} primaryColor="#FF6A00" />
            ) : (
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-xl bg-[#FF6A00]/10 text-[#FF6A00] flex items-center justify-center font-bold border border-[#FF6A00]/20" title="Current Workspace">
                  {branding.branding_site_name?.[0]?.toUpperCase() || 'W'}
                </div>
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-6 custom-scrollbar pb-10">
            {filteredGroups.map((group, idx) => (
              <div key={idx} className="space-y-1">
                {!isSidebarCollapsed && (
                  <p className="px-3 mb-1.5 text-[11px] font-bold text-slate-400">
                    {group.title}
                  </p>
                )}
                {group.items.map(({ to, icon: Icon, label, isGloballyDisabled }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    title={isSidebarCollapsed ? label : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-200 ${
                        isActive
                          ? (isDark ? "bg-[#FF6A00]/10 text-[#FF6A00] font-semibold border border-[#FF6A00]/20" : "bg-[#FF6A00]/10 text-[#FF6A00] font-semibold border border-[#FF6A00]/20")
                          : (isDark 
                              ? (isGloballyDisabled ? "text-slate-500 hover:text-slate-400 hover:bg-white/5 border border-transparent opacity-60" : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent")
                              : (isGloballyDisabled ? "text-slate-400 hover:text-slate-500 hover:bg-slate-100/80 border border-transparent opacity-60" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent")
                            )
                      }`
                    }
                  >
                    <Icon size={isSidebarCollapsed ? 22 : 18} className={({isActive}) => isActive ? "text-[#FF6A00]" : (isGloballyDisabled ? "text-inherit opacity-60 grayscale" : "text-inherit")} />
                    {!isSidebarCollapsed && (
                      <div className="flex items-center justify-between w-full">
                        <span className={isGloballyDisabled ? "line-through decoration-slate-600/50" : ""}>{t(`nav.${label.toLowerCase().replace(/ /g, '')}`, label)}</span>
                        {isGloballyDisabled && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${isDark ? "bg-slate-800/50 text-slate-500 border border-slate-700/50" : "bg-slate-200/50 text-slate-400 border border-slate-300/50"}`}>Disabled</span>
                        )}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <SubscriptionBanner />
        <header className={`relative z-30 px-4 lg:px-6 py-3 border-b backdrop-blur-2xl transition-colors ${isDark ? "bg-[#0b101e]/80 border-white/5" : "bg-white/80 border-slate-200/80"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className={`lg:hidden p-2 rounded-xl transition-colors ${isDark ? "hover:bg-white/10" : "hover:bg-slate-100"}`}>
                <Menu size={20} />
              </button>
              <div className="hidden md:flex items-center gap-3 bg-transparent">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors focus-within:ring-2 focus-within:ring-[#FF6A00]/50 ${isDark ? "bg-white/5 border-white/10 focus-within:bg-white/10" : "bg-slate-50 border-slate-200 focus-within:bg-white"}`}>
                  <Search size={16} className="text-slate-400" />
                  <input type="text" placeholder="Search..." className={`bg-transparent border-none outline-none text-sm w-64 lg:w-80 ${isDark ? "text-white placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"}`} />
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? "bg-white/10 text-slate-400" : "bg-slate-200 text-slate-500"}`}>⌘K</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-3">
              <div className="relative" ref={quickActionRef}>
                <button
                  onClick={() => setQuickActionOpen(!quickActionOpen)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-[#FF6A00] to-[#FF4500] hover:shadow-[#FF6A00]/25`}
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Create</span>
                </button>
                {quickActionOpen && (
                  <div className={`absolute right-0 top-12 w-48 rounded-xl border p-1 z-50 shadow-2xl animate-in slide-in-from-top-2 ${isDark ? "bg-[#1f2937] border-white/10" : "bg-white border-slate-200"}`}>
                    <button onClick={() => { setQuickActionOpen(false); navigate("/app/broadcast"); }} className={`flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg ${isDark ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"}`}><PlayCircle size={15} className="text-[#FF6A00]" /> New Broadcast</button>
                    <button onClick={() => { setQuickActionOpen(false); navigate("/app/contacts"); }} className={`flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg ${isDark ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"}`}><Users size={15} className="text-blue-500" /> Add Contact</button>
                    <button onClick={() => { setQuickActionOpen(false); navigate("/app/flow-builder"); }} className={`flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg ${isDark ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-50 text-slate-700"}`}><Workflow size={15} className="text-emerald-500" /> Create Flow</button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                className={`p-2.5 rounded-xl transition-all border ${isDark ? "bg-white/5 border-white/5 hover:bg-white/10 text-slate-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                title="Toggle Theme"
              >
                {isDark ? <SunMedium size={18} /> : <Moon size={18} />}
              </button>

              <div className="relative" ref={notifRef}>
                <button onClick={() => setNotifOpen((o) => !o)} className={`relative p-2.5 rounded-xl transition-all border ${isDark ? "bg-white/5 border-white/5 hover:bg-white/10 text-slate-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}>
                  <Bell size={18} className={unreadCount > 0 ? "text-[#FF6A00]" : ""} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#FF6A00] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0b101e]">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className={`absolute right-0 top-14 w-[calc(100vw-2rem)] sm:w-[380px] max-h-[500px] rounded-2xl border z-50 flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-top-2 ${isDark ? "bg-[#1f2937] border-white/10 shadow-black/50" : "bg-white border-slate-200 shadow-slate-200/60"}`}>
                    <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-white/10" : "border-slate-100"}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">Notifications</span>
                        {unreadCount > 0 && <span className="bg-[#FF6A00]/15 text-[#FF6A00] text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount} new</span>}
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-[11px] text-[#FF6A00] font-semibold hover:underline">Mark all read</button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center py-12 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                          <Bell size={32} className="mb-3 opacity-30" />
                          <p className="text-sm font-medium">You're all caught up!</p>
                        </div>
                      ) : (
                        <>
                          {unread.length > 0 && <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">New</p>}
                          {unread.map((n) => <NotificationItem key={n.id} notif={n} onNavigate={handleNotifNavigate} isDark={isDark} />)}
                          {read.length > 0 && <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Earlier</p>}
                          {read.map((n) => <NotificationItem key={n.id} notif={n} onNavigate={handleNotifNavigate} isDark={isDark} />)}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className={`flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl transition-all border ${isDark ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-white border-slate-200 hover:bg-slate-50 shadow-sm"}`}
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-lg object-cover shadow-md" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6A00] to-[#FF4500] text-white flex items-center justify-center text-sm font-bold shadow-md">
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:flex flex-col items-start min-w-[80px]">
                    <span className="text-[13px] font-semibold truncate w-full text-left leading-tight">{user?.name}</span>
                    <span className="text-[10px] text-slate-400 capitalize font-medium">{user?.role}</span>
                  </div>
                  <ChevronDown size={14} className="text-slate-400 hidden sm:block ml-1" />
                </button>
                {userMenuOpen && (
                  <div className={`absolute right-0 top-14 w-60 rounded-2xl border p-1 z-50 shadow-2xl animate-in slide-in-from-top-2 ${isDark ? "bg-[#1f2937] border-white/10 shadow-black/50" : "bg-white border-slate-200 shadow-slate-200/60"}`}>
                    <div className="px-3 py-3 mb-1 bg-black/5 dark:bg-white/5 rounded-xl mx-1 mt-1">
                      <p className="text-sm font-bold truncate">{user?.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <div className="space-y-0.5 mt-1 px-1">
                      {(user?.role === 'sales_partner' || user?.role === 'admin' || user?.role === 'superadmin') && (
                        <button onClick={() => { setUserMenuOpen(false); navigate("/app/partner-dashboard"); }} className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm text-emerald-500 font-medium rounded-lg ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}>
                          <DollarSign size={16} /> Partner Panel
                        </button>
                      )}
                      <button onClick={() => { setUserMenuOpen(false); navigate("/app/team"); }} className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium rounded-lg ${isDark ? "hover:bg-white/5 text-slate-300" : "hover:bg-slate-50 text-slate-700"}`}>
                        <Users size={16} /> Team Access
                      </button>
                      <button onClick={() => { setUserMenuOpen(false); navigate("/app/settings"); }} className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium rounded-lg ${isDark ? "hover:bg-white/5 text-slate-300" : "hover:bg-slate-50 text-slate-700"}`}>
                        <Settings size={16} /> Preferences
                      </button>
                    </div>
                    <div className={`mt-1 pt-1 border-t px-1 ${isDark ? "border-white/10" : "border-slate-100"}`}>
                      <button onClick={handleLogout} className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm font-semibold text-rose-500 rounded-lg ${isDark ? "hover:bg-rose-500/10" : "hover:bg-rose-50"}`}>
                        <LogOut size={16} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-6 custom-scrollbar relative">
          <div className="h-full animate-in fade-in duration-500 max-w-[1600px] mx-auto w-full">
            {!currentOrganization ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className={`p-8 rounded-3xl max-w-md w-full border text-center shadow-xl ${isDark ? 'bg-[#1f2937] border-white/10' : 'bg-white border-slate-200'}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    {isAutoCreating ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6A00]"></div> : <Building2 size={32} className="text-[#FF6A00]" />}
                  </div>
                  <h2 className="text-2xl font-bold mb-3">{isAutoCreating ? 'Setting up...' : 'Workspace Required'}</h2>
                  <p className={`mb-8 text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isAutoCreating ? "Setting up your default workspace..." : "You need an active workspace to use the platform's features."}
                  </p>
                </div>
              </div>
            ) : isOnboardingLoading ? (
              <div className="flex h-full items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6A00]"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Removed inner banner, moved to top of layout */}
                <Outlet key={currentOrganization._id} context={{ onboardingStatus }} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

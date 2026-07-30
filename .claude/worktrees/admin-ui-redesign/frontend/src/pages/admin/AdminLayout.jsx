import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Settings, 
  ArrowLeft,
  Activity,
  ShieldCheck,
  CreditCard,
  DollarSign,
  Terminal,
  Image as ImageIcon,
  UserX,
  Flag,
  UserCheck,
  History,
  ChevronDown,
  ChevronRight,
  Cpu,
  Globe,
  Mail,
  Zap,
  Key,
  Menu,
  X,
  Search,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AdminLayout = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({
    "Analytics & Comm": true,
    "User Management": true,
    "Security & Health": true,
    "System Settings": true
  });

  const toggleGroup = (title) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const sidebarGroups = [
    {
      title: "Analytics & Comm",
      items: [
        { name: "Overview", icon: LayoutDashboard, path: "/admin/dashboard" },
        { name: "Conversations", icon: MessageSquare, path: "/admin/conversations" },
        { name: "Contact Messages", icon: Mail, path: "/admin/contact-messages" },
      ]
    },
    {
      title: "User Management",
      items: [
        { name: "Users", icon: Users, path: "/admin/users" },
        { name: "Sales Partners", icon: DollarSign, path: "/admin/sales-partners" },
        { name: "Sign-up Requests", icon: UserCheck, path: "/admin/signup-requests" },
        { name: "Deletion Requests", icon: UserX, path: "/admin/deletion-requests" },
        { name: "Subscriptions", icon: CreditCard, path: "/admin/subscriptions" },
        { name: "Payments", icon: DollarSign, path: "/admin/payments" },
      ]
    },
    {
      title: "Security & Health",
      items: [
        { name: "Fraud Detection", icon: ShieldCheck, path: "/admin/fraud" },
        { name: "System Health", icon: Activity, path: "/admin/health" },
        { name: "System Logs", icon: Terminal, path: "/admin/logs" },
        { name: "Audit Logs", icon: History, path: "/admin/activities" },
        { name: "System Media", icon: ImageIcon, path: "/admin/media" },
        { name: "Feature Flags", icon: Flag, path: "/admin/feature-flags" },
      ]
    },
    {
      title: "System Settings",
      items: [
        { name: "Core System", icon: Settings, path: "/admin/settings/core" },
        { name: "API Explorer", icon: Terminal, path: "/admin/api-explorer" },
        { name: "IG Manual Tool", icon: MessageSquare, path: "/admin/instagram-tools" },
        { name: "AI Configuration", icon: Cpu, path: "/admin/settings/ai" },
        { name: "Social Platforms", icon: Zap, path: "/admin/settings/social" },
        { name: "API Integrations", icon: Key, path: "/admin/settings/api" },
        { name: "Branding", icon: Globe, path: "/admin/settings/branding" },
        { name: "Email Templates", icon: Mail, path: "/admin/settings/email" },
        { name: "Languages", icon: MessageSquare, path: "/admin/settings/languages" },
      ]
    }
  ];

  // Find active page name for header
  let activePageName = "Admin";
  let activePageDesc = "Manage and track system-wide activity";
  for (const group of sidebarGroups) {
    const activeItem = group.items.find(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'));
    if (activeItem) {
      activePageName = activeItem.name;
      break;
    }
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-5 pb-2 shrink-0">
        <Link to="/admin/dashboard" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-400 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-base block leading-tight">Admin</span>
            <span className="text-gray-500 text-[10px] font-medium tracking-wider uppercase">Control Panel</span>
          </div>
        </Link>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        <nav className="space-y-5">
          {sidebarGroups.map((group) => {
            const isOpen = openGroups[group.title];
            return (
              <div key={group.title}>
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.12em] hover:text-gray-300 transition-colors"
                >
                  <span>{group.title}</span>
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mt-1 space-y-0.5"
                    >
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 text-[13px] ${
                              isActive 
                                ? "bg-brand-500/10 text-brand-400 font-semibold" 
                                : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                            }`}
                          >
                            <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-400' : ''}`} />
                            <span>{item.name}</span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Back to app */}
      <div className="p-4 border-t border-white/[0.04] shrink-0">
        <Link 
          to="/app/dashboard"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">Back to App</span>
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#060912] text-white flex">
      {/* Desktop Sidebar */}
      <aside className="w-[260px] border-r border-white/[0.06] bg-[#0a0e1a]/80 backdrop-blur-xl sticky top-0 h-screen flex-col hidden md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-[#0a0e1a] border-r border-white/[0.06] z-50 flex flex-col md:hidden"
            >
              <div className="flex justify-end p-3">
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all">
                  <X size={20} />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#060912]/80 backdrop-blur-xl border-b border-white/[0.06] px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 transition-all border border-white/[0.06]"
              >
                <Menu size={18} />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {activePageName}
                </h1>
                <p className="text-gray-500 text-xs mt-0.5 hidden sm:block">{activePageDesc}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="px-3 py-1.5 bg-brand-500/10 text-brand-400 rounded-full border border-brand-500/20 text-xs font-semibold tracking-wide flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                <span className="hidden sm:inline">System Online</span>
                <span className="sm:hidden">Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4 sm:p-6 lg:p-8"
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

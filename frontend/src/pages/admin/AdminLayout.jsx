import React, { useState } from "react";
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
  Key
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AdminLayout = () => {
  const location = useLocation();

  const [openGroups, setOpenGroups] = useState({
    "Analytics & Comm": true,
    "User Management": false,
    "Security & Health": false,
    "System Settings": true
  });

  const toggleGroup = (title) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

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

  // Helper to find the current active page name for the header
  let activePageName = "Admin";
  for (const group of sidebarGroups) {
    const activeItem = group.items.find(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'));
    if (activeItem) {
      activePageName = activeItem.name;
      break;
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#030712]/50 backdrop-blur-xl sticky top-0 h-screen flex flex-col hidden md:block">
        <div className="p-6 pb-2 shrink-0">
          <Link to="/app/dashboard" className="flex items-center gap-2 text-emerald-500 font-bold text-xl mb-6 group">
            <ShieldCheck className="w-8 h-8" />
            <span>Admin Panel</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
          <nav className="space-y-4">
            {sidebarGroups.map((group) => {
              const isOpen = openGroups[group.title];
              return (
                <div key={group.title} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
                  >
                    <span>{group.title}</span>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-1"
                      >
                        {group.items.map((item) => {
                          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${
                                isActive 
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                                  : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                              }`}
                            >
                              <item.icon className="w-4 h-4 shrink-0" />
                              <span className="font-medium text-sm">{item.name}</span>
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

        <div className="p-6 border-t border-white/5 bg-[#030712]/10 mt-auto shrink-0">
          <Link 
            to="/app/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to App</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto h-screen relative">
        <header className="mb-8 flex justify-between items-center sticky top-0 bg-[#030712]/80 backdrop-blur-md z-10 py-4 -my-4 border-b border-white/5">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {activePageName}
            </h1>
            <p className="text-gray-400 text-sm mt-1">Manage and track system-wide activity</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-xs font-semibold tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              System Online
            </div>
          </div>
        </header>

        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="pt-4"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};

export default AdminLayout;

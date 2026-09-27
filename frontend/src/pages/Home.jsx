import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Home as HomeIcon,
  Bot,
  Zap,
  BarChart3,
  Shield,
  Workflow,
  Menu,
  X,
  ArrowRight,
  Globe,
  Users,
  Send,
  Sparkles,
  CheckCircle2,
  Star,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Youtube,
  Facebook,
  Linkedin,
  MessageCircle,
  CalendarDays,
  LayoutDashboard,
  BadgeCheck,
  Play,
  Layers,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { useAuthStore, useBrandingStore } from "../store";

/* ─────────────────────────────────────────────────────────
   Premium Light Theme Tokens (Self-contained)
   Background:    #FFFFFF (White) & #F8FAFC (Slate 50)
   Surface:       #FFFFFF with subtle shadows
   Primary Text:  #0F172A (Slate 900)
   Muted Text:    #64748B (Slate 500)
   Accent Blue:   #2563EB (Blue 600)
   Accent Light:  #EFF6FF (Blue 50)
───────────────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

/* ─── Global styles: Clean modern sans-serif ─── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    .gflow-sans { 
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; 
    }
    
    @keyframes gflow-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .gflow-marquee { animation: gflow-marquee 35s linear infinite; }
    
    @keyframes gflow-float { 
      0%, 100% { transform: translateY(0px) rotate(0deg); } 
      50% { transform: translateY(-12px) rotate(2deg); } 
    }
    .gflow-float { animation: gflow-float 6s ease-in-out infinite; }

    .gflow-gradient-text {
      background: linear-gradient(135deg, #0F172A 0%, #334155 40%, #1E40AF 70%, #2563EB 100%);
      -webkit-background-clip: text; 
      background-clip: text; 
      color: transparent;
    }
    
    .glass-nav {
      background: rgba(255, 255, 255, 0.65);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-bottom: 1px solid rgba(255,255,255,0.4);
    }
    
    .premium-glass-card {
      background: linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 100%);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.8);
      box-shadow: 0 30px 60px -12px rgba(15,23,42,0.08), 0 0 0 1px rgba(255,255,255,0.6) inset;
    }

    ::selection { background: rgba(37, 99, 235, 0.2); color: #0F172A; }
  `}</style>
);

/* ─── Animated Counter ─── */
const AnimatedCounter = ({ target, suffix = "" }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const steps = 48;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 1800 / steps);
    return () => clearInterval(timer);
  }, [target]);
  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

/* ─── Premium Dashboard Mockup (Light Mode) ─── */
const MiniSparkline = ({ points, color = "#2563EB", id }) => {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 84;
  const height = 26;
  const step = width / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  });
  const pathD = `M ${coords.join(" L ")}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg className="w-[74px] sm:w-[84px] h-[26px] overflow-visible" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#spark-${id})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const DashboardMockup = () => {
  const [selectedRange, setSelectedRange] = useState("30d");
  const [hoveredBarIndex, setHoveredBarIndex] = useState(4);

  const dataset = {
    "7d": {
      label: "Last 7 Days",
      messages: { value: "3.4K", trend: "+18.2%", spark: [14, 22, 19, 28, 35, 42, 54] },
      engagement: { value: "91.8%", trend: "+4.6%", spark: [84, 86, 85, 88, 89, 90, 92] },
      posts: { value: "62", trend: "+28.4%", spark: [4, 6, 8, 12, 16, 20, 26] },
      bars: [
        { label: "Mon", height: 50, value: "480 msgs" },
        { label: "Tue", height: 65, value: "620 msgs" },
        { label: "Wed", height: 82, value: "810 msgs" },
        { label: "Thu", height: 70, value: "690 msgs" },
        { label: "Fri", height: 95, value: "940 msgs" },
        { label: "Sat", height: 58, value: "560 msgs" },
        { label: "Sun", height: 75, value: "720 msgs" },
      ],
      ticker: "Auto-DM campaign engaged 142 followers across Instagram & Facebook"
    },
    "30d": {
      label: "Last 30 Days",
      messages: { value: "12.4K", trend: "+14.2%", spark: [28, 34, 30, 48, 55, 68, 76, 92] },
      engagement: { value: "89.4%", trend: "+5.1%", spark: [78, 81, 80, 83, 85, 87, 89] },
      posts: { value: "234", trend: "+22.5%", spark: [18, 24, 22, 32, 40, 52, 64] },
      bars: [
        { label: "W1", height: 45, value: "2.6K msgs" },
        { label: "W2", height: 68, value: "3.4K msgs" },
        { label: "W3", height: 85, value: "4.1K msgs" },
        { label: "W4", height: 96, value: "4.9K msgs" },
        { label: "Peak", height: 88, value: "4.3K msgs" },
        { label: "Avg", height: 72, value: "3.6K msgs" },
        { label: "Live", height: 92, value: "4.7K msgs" },
      ],
      ticker: "AI Lead Copilot resolved +3,480 queries autonomously with zero escalations"
    },
    "90d": {
      label: "Last 90 Days",
      messages: { value: "48.2K", trend: "+34.5%", spark: [20, 32, 44, 58, 68, 82, 98] },
      engagement: { value: "88.6%", trend: "+6.8%", spark: [76, 79, 82, 84, 86, 88, 89] },
      posts: { value: "812", trend: "+41.2%", spark: [120, 180, 240, 360, 490, 640, 812] },
      bars: [
        { label: "M1", height: 58, value: "13.8K msgs" },
        { label: "M2", height: 78, value: "16.9K msgs" },
        { label: "M3", height: 98, value: "21.4K msgs" },
        { label: "Q-Avg", height: 75, value: "15.2K msgs" },
        { label: "High", height: 92, value: "19.8K msgs" },
        { label: "Scale", height: 86, value: "18.1K msgs" },
        { label: "Target", height: 94, value: "20.5K msgs" },
      ],
      ticker: "Enterprise pipeline: 120 WhatsApp broadcast campaigns successfully delivered"
    },
  };

  const current = dataset[selectedRange];

  return (
    <div className="w-full max-w-full rounded-2xl premium-glass-card overflow-hidden shadow-2xl border border-slate-200/80 bg-white/95 mx-auto">
      {/* Top Browser / Window Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-100 bg-slate-50/80 w-full min-w-0">
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-rose-400/80" />
          <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-amber-400/80" />
          <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-400/80" />
        </div>
        
        {/* Address Pill */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 bg-white border border-slate-200/80 rounded-full text-[10px] sm:text-[11px] text-slate-500 shadow-xs font-medium max-w-[150px] sm:max-w-none">
          <Shield className="w-3 h-3 text-blue-600 shrink-0" />
          <span className="text-slate-700 truncate">app.graxionflow.com</span>
        </div>

        {/* Live sync beacon */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-medium text-emerald-600 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-[10px] sm:text-[11px]">Live</span>
        </div>
      </div>

      <div className="flex bg-slate-50/20 w-full min-w-0">
        {/* Vertical Icon Rail - hidden on mobile to give full space to dashboard stats */}
        <div className="hidden sm:flex w-11 sm:w-14 border-r border-slate-100 py-3.5 flex-col items-center justify-between bg-white shrink-0">
          <div className="flex flex-col items-center gap-2.5 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
            </div>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors">
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors">
              <Workflow className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          {/* Connected Platform Status Dots */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="WhatsApp Connected" />
            <span className="w-2 h-2 rounded-full bg-pink-500" title="Instagram Connected" />
            <span className="w-2 h-2 rounded-full bg-red-500" title="YouTube Connected" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-2 sm:p-4 md:p-5 overflow-hidden w-full min-w-0">
          {/* Header Row: Title & Range Selector */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-4 w-full min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <h3 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight shrink-0">
                  Overview
                </h3>
                <span className="text-slate-300">·</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">{current.label}</span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Unified metrics across Meta, YouTube, LinkedIn & Telegram
              </p>
            </div>

            {/* Interactive Filter Controls */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200/60 shadow-xs shrink-0">
              {[
                { id: "7d", label: "7D" },
                { id: "30d", label: "30D" },
                { id: "90d", label: "90D" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedRange(tab.id)}
                  type="button"
                  className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-md transition-all ${
                    selectedRange === tab.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3 Responsive KPI Cards */}
          <div className="grid grid-cols-3 gap-1 sm:gap-3 mb-2 sm:mb-4 w-full min-w-0">
            {/* Card 1: Messages Sent */}
            <div className="group rounded-lg sm:rounded-xl border border-slate-200/80 bg-white p-1.5 sm:p-3 shadow-xs hover:border-blue-200 hover:shadow-sm transition-all flex flex-col justify-between min-w-0 overflow-hidden">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5 sm:mb-1 min-w-0">
                  <span className="text-[9px] sm:text-xs font-semibold text-slate-500 truncate min-w-0">
                    Messages
                  </span>
                  <span className="text-[8px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded shrink-0">
                    {current.messages.trend}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-0.5 sm:mt-1 min-w-0">
                  <p className="text-xs sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                    {current.messages.value}
                  </p>
                  <div className="hidden sm:block shrink-0">
                    <MiniSparkline points={current.messages.spark} color="#2563EB" id="msgs" />
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 mt-1 truncate hidden sm:block">
                99.8% delivery · WhatsApp & DMs
              </p>
            </div>

            {/* Card 2: Avg Engagement */}
            <div className="group rounded-lg sm:rounded-xl border border-slate-200/80 bg-white p-1.5 sm:p-3 shadow-xs hover:border-emerald-200 hover:shadow-sm transition-all flex flex-col justify-between min-w-0 overflow-hidden">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5 sm:mb-1 min-w-0">
                  <span className="text-[9px] sm:text-xs font-semibold text-slate-500 truncate min-w-0">
                    Engagement
                  </span>
                  <span className="text-[8px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded shrink-0">
                    {current.engagement.trend}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-0.5 sm:mt-1 min-w-0">
                  <p className="text-xs sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                    {current.engagement.value}
                  </p>
                  <div className="hidden sm:block shrink-0">
                    <MiniSparkline points={current.engagement.spark} color="#059669" id="eng" />
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 mt-1 truncate hidden sm:block">
                1.4s AI response latency
              </p>
            </div>

            {/* Card 3: Posts Published */}
            <div className="group rounded-lg sm:rounded-xl border border-slate-200/80 bg-white p-1.5 sm:p-3 shadow-xs hover:border-indigo-200 hover:shadow-sm transition-all flex flex-col justify-between min-w-0 overflow-hidden">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5 sm:mb-1 min-w-0">
                  <span className="text-[9px] sm:text-xs font-semibold text-slate-500 truncate min-w-0">
                    Published
                  </span>
                  <span className="text-[8px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded shrink-0">
                    {current.posts.trend}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-0.5 sm:mt-1 min-w-0">
                  <p className="text-xs sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                    {current.posts.value}
                  </p>
                  <div className="hidden sm:block shrink-0">
                    <MiniSparkline points={current.posts.spark} color="#6366F1" id="posts" />
                  </div>
                </div>
              </div>

              <div className="items-center gap-1.5 mt-1 hidden sm:flex">
                <div className="flex items-center -space-x-1">
                  <span className="w-2 h-2 rounded-full bg-[#25D366] border border-white" />
                  <span className="w-2 h-2 rounded-full bg-[#E1306C] border border-white" />
                  <span className="w-2 h-2 rounded-full bg-[#FF0000] border border-white" />
                  <span className="w-2 h-2 rounded-full bg-[#0A66C2] border border-white" />
                </div>
                <span className="text-[10px] text-slate-400 font-medium truncate">Across channels</span>
              </div>
            </div>
          </div>

          {/* Interactive Throughput Visualizer Area */}
          <div className="rounded-lg sm:rounded-xl border border-slate-200/80 bg-white p-2 sm:p-3.5 shadow-xs w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-1 sm:mb-2 w-full min-w-0">
              <div className="flex items-center gap-1.5 text-xs min-w-0">
                <span className="font-semibold text-slate-800 text-[10px] sm:text-xs shrink-0">Dispatch Velocity</span>
                <span className="text-slate-300 hidden sm:inline">·</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium hidden sm:inline truncate">{current.label}</span>
              </div>
              <div className="text-[9px] sm:text-[11px] font-bold text-blue-600 shrink-0">
                {current.bars[hoveredBarIndex]?.value || "4.3K msgs"}
              </div>
            </div>

            {/* Micro Bar Chart */}
            <div className="flex items-end gap-1 sm:gap-2 h-12 sm:h-16 pt-1 w-full min-w-0">
              {current.bars.map((bar, i) => {
                const isHovered = hoveredBarIndex === i;
                return (
                  <div
                    key={bar.label + i}
                    onClick={() => setHoveredBarIndex(i)}
                    onMouseEnter={() => setHoveredBarIndex(i)}
                    className="group flex-1 min-w-0 flex flex-col justify-end items-center h-full cursor-pointer relative overflow-hidden"
                  >
                    <div
                      className={`w-full rounded-t-sm sm:rounded-t transition-all duration-200 ${
                        isHovered
                          ? "bg-blue-600 shadow-xs"
                          : "bg-gradient-to-t from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300"
                      }`}
                      style={{ height: `${bar.height}%` }}
                    />
                    <span
                      className={`text-[8px] sm:text-[10px] font-medium mt-1 transition-colors truncate max-w-full text-center ${
                        isHovered ? "text-blue-600 font-bold" : "text-slate-400"
                      }`}
                    >
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Live Ticker Feed */}
            <div className="mt-1.5 sm:mt-2 pt-1 sm:pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[11px] text-slate-500 w-full min-w-0 overflow-hidden">
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 overflow-hidden flex-1 mr-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span className="font-semibold text-slate-700 shrink-0">Auto:</span>
                <span className="truncate text-slate-500 min-w-0 block">{current.ticker}</span>
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 shrink-0 hidden sm:inline">Live Sync</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Floating platform chip (Light mode) ─── */
const PlatformChip = ({ icon: Icon, color, position, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6, delay, type: "spring" }}
    className={`absolute ${position} gflow-float w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl hidden md:flex items-center justify-center z-20 bg-white border border-slate-100 shadow-md`}
    style={{
      animationDelay: `${delay}s`,
      boxShadow: "0 12px 30px -8px rgba(0,0,0,0.08)",
    }}
  >
    <Icon className="w-5 h-5" style={{ color }} />
  </motion.div>
);

/* ─── Feature row (Light clean style) ─── */
const FeatureRow = ({ icon: Icon, title, description }) => (
  <motion.div
    variants={fadeUp}
    className="flex items-start gap-4 p-5 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
  >
    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-blue-600" />
    </div>
    <div>
      <h3 className="text-base font-bold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

/* ─── Platform card (Light Mode) ─── */
const PlatformCard = ({
  icon: Icon,
  name,
  color,
  description,
  capabilities,
  metaVerified = false,
}) => (
  <motion.article
    variants={fadeUp}
    className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:-translate-y-1"
  >
    <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-500">
      <Icon className="w-full h-full" style={{ color }} />
    </div>

    <div className="flex items-center gap-3 mb-5 relative z-10">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-100 group-hover:bg-white transition-colors shadow-sm">
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900">{name}</h3>
        {metaVerified && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-0.5">
            <BadgeCheck className="h-3 w-3" /> Meta verified
          </span>
        )}
      </div>
    </div>
    <p className="min-h-[48px] text-sm leading-relaxed text-slate-600 mb-6 relative z-10">
      {description}
    </p>
    <ul className="space-y-3 relative z-10">
      {capabilities.map((cap) => (
        <li
          key={cap}
          className="flex items-start gap-2.5 text-sm font-medium text-slate-700"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <span>{cap}</span>
        </li>
      ))}
    </ul>
  </motion.article>
);

export default function Home() {
  const navigate = useNavigate();
  const { branding, fetchBranding } = useBrandingStore();
  const { isAuthenticated } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const brandName = "Graxion Flow";
  const tagline = "Premium Social Operations";
  const contactEmail = useMemo(
    () => branding?.branding_contact_email || "hello@graxion.in",
    [branding],
  );
  const contactPhone = useMemo(
    () => branding?.branding_contact_phone || "+1 (800) 123-4567",
    [branding],
  );
  const footerText = useMemo(
    () =>
      branding?.branding_footer_text || "© 2026 Graxion. All rights reserved.",
    [branding],
  );
  const logoUrl =
    "https://res.cloudinary.com/dh6uiegxw/image/upload/v1784957805/social_hub/qth6s6bzkoawy0q1qprl.png";

  const address = useMemo(() => branding?.branding_address || '', [branding]);
  const socialTwitter = useMemo(() => branding?.branding_social_twitter || '', [branding]);
  const socialLinkedin = useMemo(() => branding?.branding_social_linkedin || '', [branding]);
  const socialInstagram = useMemo(() => branding?.branding_social_instagram || '', [branding]);
  const socialYoutube = useMemo(() => branding?.branding_social_youtube || '', [branding]);

  const testimonials = [
    {
      quote:
        "Graxion Flow completely transformed our workflow. It feels like an Apple product—clean, incredibly fast, and it just works out of the box.",
      name: "Sarah Jenkins",
      role: "Marketing Director, TechNova",
      avatar: "bg-blue-100 text-blue-700",
      initials: "SJ",
    },
    {
      quote:
        "The interface is gorgeous. We finally ditched our clunky legacy tools. Scheduling and AI replies in one clean dashboard saves us 15 hours a week.",
      name: "Michael Chen",
      role: "E-commerce Founder",
      avatar: "bg-indigo-100 text-indigo-700",
      initials: "MC",
    },
    {
      quote:
        "It's rare to find B2B software that looks this good and performs even better. The WhatsApp automation alone paid for itself on day one.",
      name: "Elena Rodriguez",
      role: "Head of Support",
      avatar: "bg-emerald-100 text-emerald-700",
      initials: "ER",
    },
  ];

  useEffect(() => {
    fetchBranding().catch(() => { });
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchBranding]);

  useEffect(() => {
    document.title = `${brandName} — ${tagline}`;
  }, [brandName, tagline]);

  const goAuth = (path) => {
    if (isAuthenticated) {
      navigate("/app/dashboard");
      return;
    }
    navigate(path);
  };

  const navLinks = [
    { label: "Platform", href: "#features" },
    { label: "Integrations", href: "#platforms" },
    { label: "Workflow", href: "#workflow" },
    { label: "Pricing", href: "/pricing" },
  ];

  return (
    <div className="gflow-sans min-h-screen bg-slate-50 text-slate-900 w-full max-w-full overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      <GlobalStyles />

      {/* ─── PREMIUM NAVBAR ─── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
            ? "glass-nav border-b border-slate-200/60 py-3"
            : "bg-transparent py-5"
          }`}
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Graxion Flow"
                className="h-8 w-auto group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <MessageSquare className="text-white h-4.5 w-4.5" />
              </div>
            )}
            <span className="text-xl font-bold tracking-tight text-slate-900">
              {brandName}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 bg-white/50 backdrop-blur-md px-6 py-2.5 rounded-full border border-slate-200 shadow-sm">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[14px] font-semibold text-slate-600 hover:text-blue-600 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => goAuth("/login")}
              className="px-5 py-2.5 text-[14px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => goAuth("/register")}
              className="px-6 py-2.5 text-[14px] font-bold rounded-full text-white bg-slate-900 hover:bg-blue-600 shadow-lg shadow-slate-900/10 hover:shadow-blue-600/25 transition-all duration-300 active:scale-95"
            >
              Get Started
            </button>
          </div>

          <button
            className="md:hidden p-2 text-slate-600 bg-white rounded-full shadow-sm border border-slate-200"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ─── MOBILE MENU ─── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[60] bg-white flex flex-col"
          >
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Graxion Flow"
                    className="h-7 w-auto"
                  />
                ) : null}
                <span className="text-xl font-bold text-slate-900">
                  {brandName}
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-500 hover:text-slate-900 p-2 bg-slate-50 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col px-6 py-6 gap-6 overflow-y-auto">
              <div className="space-y-4">
                <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Navigation</p>
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-2xl font-bold text-slate-800 hover:text-blue-600 transition-colors"
                >
                  Features
                </a>
                <Link
                  to="/integrations"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-2xl font-bold text-slate-800 hover:text-blue-600 transition-colors"
                >
                  Integrations
                </Link>
                <Link
                  to="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-2xl font-bold text-slate-800 hover:text-blue-600 transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  to="/roadmap"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-2xl font-bold text-slate-800 hover:text-blue-600 transition-colors"
                >
                  Roadmap
                </Link>
                <Link
                  to="/changelog"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-2xl font-bold text-slate-800 hover:text-blue-600 transition-colors"
                >
                  Changelog
                </Link>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3">Company & Legal</p>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm font-semibold text-slate-600">
                  <Link to="/about-us" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600">About Us</Link>
                  <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600">Blog</Link>
                  <Link to="/careers" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600">Careers</Link>
                  <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600">Contact</Link>
                  <Link to="/privacy-policy" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600">Privacy Policy</Link>
                  <Link to="/terms-of-service" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600">Terms of Service</Link>
                  <Link to="/security" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600">Security</Link>
                  <Link to="/cookie-policy" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600">Cookie Policy</Link>
                </div>
              </div>
            </div>
            <div className="mt-auto p-6 space-y-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  goAuth("/register");
                }}
                className="w-full py-4 rounded-2xl font-bold text-lg text-white bg-blue-600 shadow-lg shadow-blue-500/25"
              >
                Start for free
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  goAuth("/login");
                }}
                className="w-full py-4 bg-white text-slate-700 rounded-2xl font-bold text-lg border border-slate-200 shadow-sm"
              >
                Sign in
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HERO SECTION (Light & Clean) ─── */}
      <section className="relative pt-24 sm:pt-36 lg:pt-48 pb-14 sm:pb-24 lg:pb-32 overflow-hidden bg-[#F8FAFC] w-full max-w-full">
        {/* Soft Background Orbs - Clamped to inset-0 to prevent horizontal scroll */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[240px] sm:w-[600px] lg:w-[800px] h-[240px] sm:h-[600px] lg:h-[800px] bg-gradient-to-br from-blue-200/40 via-indigo-200/30 to-purple-200/20 rounded-full blur-[50px] sm:blur-[120px] -translate-y-1/4 translate-x-0 sm:translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[200px] sm:w-[500px] lg:w-[600px] h-[200px] sm:h-[500px] lg:h-[600px] bg-gradient-to-tr from-emerald-100/40 to-blue-200/30 rounded-full blur-[40px] sm:blur-[100px] translate-y-1/4 translate-x-0 sm:-translate-x-1/4" />
          <div className="absolute top-1/2 left-1/2 w-[180px] sm:w-[400px] lg:w-[500px] h-[180px] sm:h-[400px] lg:h-[500px] bg-violet-200/20 rounded-full blur-[50px] sm:blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none"></div>

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_1.1fr] gap-8 sm:gap-14 lg:gap-16 items-center justify-center w-full max-w-full">
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left w-full max-w-2xl mx-auto lg:mx-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white border border-slate-200 text-xs sm:text-sm font-semibold text-blue-600 mb-6 sm:mb-8 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" /> The new standard for social ops
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-2xl xs:text-3xl sm:text-5xl lg:text-[4.2rem] font-extrabold tracking-tight mb-4 sm:mb-6 leading-[1.2] sm:leading-[1.1] text-slate-900 w-full text-center lg:text-left"
              >
                <span className="block sm:inline">Manage social</span>{" "}
                <span className="gflow-gradient-text block sm:inline">without the chaos.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-sm sm:text-lg lg:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-8 leading-relaxed font-normal sm:font-medium text-center lg:text-left"
              >
                Graxion Flow brings YouTube, Instagram, and WhatsApp into one
                beautiful workspace. Schedule, reply, and automate—all in one
                place.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 mb-6 sm:mb-8 w-full max-w-xs sm:max-w-none mx-auto lg:mx-0"
              >
                <button
                  onClick={() => goAuth("/register")}
                  className="w-full sm:w-auto px-7 py-3.5 sm:py-4 rounded-xl sm:rounded-full font-bold flex items-center justify-center gap-2 text-white bg-slate-900 hover:bg-slate-800 shadow-md shadow-slate-900/10 active:scale-95 text-base sm:text-lg border border-slate-700"
                >
                  Start your free trial <ArrowRight className="h-4.5 w-4.5" />
                </button>
                <Link
                  to="/demo"
                  className="w-full sm:w-auto px-7 py-3.5 sm:py-4 rounded-xl sm:rounded-full font-bold flex items-center justify-center gap-2 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs active:scale-95 text-base sm:text-lg"
                >
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-slate-700" /> Watch Demo
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 sm:gap-x-6 sm:gap-y-3 text-xs sm:text-sm font-semibold text-slate-500 mb-8 lg:mb-0 w-full"
              >
                {[
                  "No credit card needed",
                  "14-day free trial",
                  "Cancel anytime",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-1.5 sm:gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative w-full max-w-lg lg:max-w-none mx-auto mt-2 lg:mt-0 flex flex-col items-center justify-center"
            >
              {/* Mobile connected platform indicator */}
              <div className="flex md:hidden items-center justify-center mb-3 w-full px-1">
                <div className="inline-flex flex-wrap items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/80 shadow-xs text-[10px] sm:text-[11px] font-medium text-slate-600 max-w-full">
                  <span className="text-slate-400 shrink-0">Connects:</span>
                  <span className="inline-flex items-center gap-1.5 font-bold shrink-0">
                    <span className="inline-flex items-center gap-0.5 text-[#25D366]"><MessageCircle className="w-3 h-3" /> WhatsApp</span>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-0.5 text-[#E1306C]"><Instagram className="w-3 h-3" /> Instagram</span>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-0.5 text-[#FF0000]"><Youtube className="w-3 h-3" /> YouTube</span>
                  </span>
                </div>
              </div>

              {/* Decorative background for mockup */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-indigo-50 rounded-2xl sm:rounded-3xl transform rotate-0 lg:rotate-2 scale-100 lg:scale-[1.03] -z-10 shadow-inner border border-white/50 pointer-events-none"></div>

              {/* Desktop-only floating chips */}
              <div className="hidden md:block">
                <PlatformChip
                  icon={Instagram}
                  color="#E1306C"
                  position="-top-6 right-8 sm:right-12"
                  delay={0.8}
                />
                <PlatformChip
                  icon={MessageCircle}
                  color="#25D366"
                  position="top-1/4 -left-6 sm:-left-8"
                  delay={1.0}
                />
                <PlatformChip
                  icon={Youtube}
                  color="#FF0000"
                  position="bottom-12 -right-4 sm:-right-6"
                  delay={1.2}
                />
              </div>

              <DashboardMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── LOGO CLOUD & STATS ─── */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-10">
            Powering modern social teams
          </p>
          <div className="overflow-hidden relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-20 before:bg-gradient-to-r before:from-white before:to-transparent before:z-10 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-20 after:bg-gradient-to-l after:from-white after:to-transparent after:z-10">
            <div className="flex gflow-marquee gap-16 items-center w-max">
              {[...Array(3)].flatMap((_, setIdx) =>
                [
                  "YouTube",
                  "Instagram",
                  "Facebook",
                  "LinkedIn",
                  "WhatsApp",
                  "Telegram",
                ].map((platform, i) => (
                  <div
                    key={`${setIdx}-${i}`}
                    className="flex items-center gap-3 text-slate-800 opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap grayscale hover:grayscale-0 cursor-default"
                  >
                    {platform === "YouTube" && (
                      <Youtube className="w-7 h-7 text-[#FF0000]" />
                    )}
                    {platform === "Instagram" && (
                      <Instagram className="w-7 h-7 text-[#E1306C]" />
                    )}
                    {platform === "Facebook" && (
                      <Facebook className="w-7 h-7 text-[#1877F2]" />
                    )}
                    {platform === "LinkedIn" && (
                      <Linkedin className="w-7 h-7 text-[#0A66C2]" />
                    )}
                    {platform === "WhatsApp" && (
                      <MessageCircle className="w-7 h-7 text-[#25D366]" />
                    )}
                    {platform === "Telegram" && (
                      <Send className="w-7 h-7 text-[#229ED9]" />
                    )}
                    <span className="text-xl font-bold tracking-tight">
                      {platform}
                    </span>
                  </div>
                )),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHY CHOOSE GRAXION FLOW (Bento Grid Style) ─── */}
      <section id="features" className="py-24 sm:py-32 relative bg-slate-50">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
            <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm mb-3">
              Platform Features
            </h2>
            <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
              Everything you need, beautifully designed.
            </h3>
            <p className="text-lg text-slate-500 font-medium">
              We stripped away the clutter of traditional tools. What remains is
              a lightning-fast, intuitive workspace that your team will actually
              enjoy using.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Big Bento Card 1 */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="lg:col-span-2 rounded-3xl bg-white border border-slate-200 p-8 sm:p-10 shadow-sm flex flex-col justify-between overflow-hidden relative group"
            >
              <div className="relative z-10 max-w-md">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6">
                  <LayoutDashboard className="w-6 h-6 text-indigo-600" />
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-3">
                  Unified Workspace
                </h4>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Stop constantly switching between tabs. View all your incoming
                  messages, mentions, and scheduled posts across 5 networks in
                  one seamless view.
                </p>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-100 relative z-10">
                <div className="flex -space-x-3">
                  {[Youtube, Instagram, Facebook, Linkedin, MessageCircle].map(
                    (Icon, i) => (
                      <div
                        key={i}
                        className="w-12 h-12 rounded-full bg-white border-2 border-slate-50 shadow-sm flex items-center justify-center relative hover:z-20 transition-transform hover:-translate-y-1"
                      >
                        <Icon className="w-5 h-5 text-slate-600" />
                      </div>
                    ),
                  )}
                </div>
              </div>
              {/* Decorative BG */}
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100 transition-colors duration-700"></div>
            </motion.div>

            {/* Small Bento Card 1 */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 sm:p-10 shadow-xl shadow-blue-600/20 text-white flex flex-col justify-between relative overflow-hidden border border-blue-500/30"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-2xl font-bold mb-3">AI Co-Pilot</h4>
                <p className="text-blue-100 font-medium leading-relaxed">
                  Draft context-aware replies in your brand's exact tone of
                  voice with one click.
                </p>
              </div>
              <div className="absolute top-0 right-0 p-6 opacity-20">
                <Sparkles className="w-32 h-32" />
              </div>
            </motion.div>

            {/* List Bento Card */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="lg:col-span-3 grid md:grid-cols-2 rounded-3xl premium-glass-card overflow-hidden"
            >
              <div className="p-8 sm:p-10 border-b md:border-b-0 md:border-r border-slate-100">
                <FeatureRow
                  icon={CalendarDays}
                  title="Visual Scheduler"
                  description="Drag and drop content onto a beautiful calendar. Flow picks the best times to post."
                />
                <FeatureRow
                  icon={Send}
                  title="Auto-Publishing"
                  description="Set it and forget it. Content goes live perfectly formatted for each specific network."
                />
              </div>
              <div className="p-8 sm:p-10">
                <FeatureRow
                  icon={BarChart3}
                  title="Deep Analytics"
                  description="Gorgeous, easy-to-read reports that actually tell you what's working and what isn't."
                />
                <FeatureRow
                  icon={Shield}
                  title="Enterprise Security"
                  description="Bank-level encryption and secure OAuth connections keep your accounts perfectly safe."
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS (Clean Steps) ─── */}
      <section
        id="workflow"
        className="py-24 sm:py-32 bg-white border-t border-slate-200 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-center">
            <div className="lg:w-1/2">
              <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm mb-3">
                How it works
              </h2>
              <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-6">
                From setup to live in minutes, not days.
              </h3>
              <p className="text-lg text-slate-500 font-medium mb-10">
                We designed the onboarding to be friction-free. No engineering
                required, no complex webhooks to configure.
              </p>

              <div className="space-y-8">
                {[
                  {
                    n: "1",
                    title: "Connect your channels",
                    desc: "Securely link your social accounts with 1-click OAuth.",
                  },
                  {
                    n: "2",
                    title: "Build your workflow",
                    desc: "Set up automation rules or just start scheduling posts immediately.",
                  },
                  {
                    n: "3",
                    title: "Let Flow take over",
                    desc: "Sit back as Flow publishes content and auto-replies to routine queries.",
                  },
                ].map((step, i) => (
                  <div key={i} className="flex gap-5 relative group">
                    {/* Connecting line */}
                    {i !== 2 && (
                      <div className="absolute left-[19px] top-12 bottom-[-24px] w-[2px] bg-slate-100 group-hover:bg-blue-100 transition-colors"></div>
                    )}

                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 border-2 border-white shadow-sm ring-1 ring-slate-200 z-10 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {step.n}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900 mb-2">
                        {step.title}
                      </h4>
                      <p className="text-slate-500 font-medium">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-1/2 relative w-full">
              <div className="absolute inset-0 bg-blue-50 rounded-[2.5rem] transform rotate-3 scale-105"></div>
              <div className="relative bg-white rounded-3xl border border-slate-200 shadow-xl p-8 aspect-square flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 shadow-inner">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-2">
                  You're all set!
                </h4>
                <p className="text-slate-500 font-medium">
                  Your social presence is now on autopilot.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PLATFORMS / INTEGRATIONS ─── */}
      <section
        id="platforms"
        className="relative py-24 sm:py-32 bg-slate-50 border-t border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm mb-3">
              Integrations
            </h2>
            <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
              Connects to your world.
            </h3>
            <p className="text-lg text-slate-500 font-medium">
              Native, approved integrations with the platforms where your
              audience actually lives.
            </p>
          </div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8"
          >
            <PlatformCard
              icon={Youtube}
              name="YouTube"
              color="#FF0000"
              description="Manage Shorts and video comments without logging into Studio."
              capabilities={[
                "Schedule Shorts & Videos",
                "Threaded comment replies",
                "AI sentiment analysis",
              ]}
            />
            <PlatformCard
              icon={Instagram}
              name="Instagram"
              color="#E1306C"
              metaVerified
              description="Drive massive engagement with automated DM funnels from Reels."
              capabilities={[
                "Direct Story & Reel scheduling",
                "Comment-to-DM triggers",
                "Visual grid planner",
              ]}
            />
            <PlatformCard
              icon={MessageCircle}
              name="WhatsApp"
              color="#25D366"
              metaVerified
              description="The ultimate CRM for WhatsApp Business. Send broadcasts safely."
              capabilities={[
                "Shared team inbox",
                "Interactive message templates",
                "Contact tagging & routing",
              ]}
            />
          </motion.div>
        </div>
      </section>

      {/* ─── TESTIMONIALS (Clean Cards) ─── */}
      <section className="py-24 sm:py-32 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-16 text-center">
            Loved by modern teams
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-slate-50 rounded-3xl p-8 border border-slate-100 relative"
              >
                <div className="flex gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className="w-5 h-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-slate-700 font-medium text-lg leading-relaxed mb-8">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-4 mt-auto">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${t.avatar}`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{t.name}</h4>
                    <p className="text-sm font-medium text-slate-500">
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA (Premium Blue Gradient) ─── */}
      <section className="py-24 relative bg-white">
        <div className="max-w-6xl mx-auto px-5 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-900/20"
          >
            {/* Rich Blue Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900" />

            {/* Abstract Shapes */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px] mix-blend-screen" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/30 rounded-full blur-[100px] mix-blend-screen" />

            <div className="relative z-10 px-8 py-16 md:py-24 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-extrabold mb-6 text-white tracking-tight">
                Ready to upgrade your social workflow?
              </h2>
              <p className="text-blue-100 text-lg md:text-xl font-medium mb-10 max-w-2xl mx-auto">
                Join thousands of creators and brands using {brandName} to
                automate their growth. Setup takes 3 minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => goAuth("/register")}
                  className="w-full sm:w-auto px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 text-blue-900 bg-white hover:bg-slate-50 shadow-xl transition-transform hover:-translate-y-1 active:scale-95 text-lg"
                >
                  Start your free trial
                </button>
                <Link
                  to="/pricing"
                  className="w-full sm:w-auto px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 text-white border-2 border-blue-400/30 hover:bg-white/10 transition-colors text-lg"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CLEAN FOOTER ─── */}
      <footer className="pt-20 pb-10 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-6">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Graxion Flow"
                    className="h-8 w-auto"
                  />
                ) : null}
                <span className="text-xl font-bold text-slate-900">
                  {brandName}
                </span>
              </div>
              <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6 max-w-sm">
                The premium workspace for social media operations. Create,
                schedule, and automate across every channel with ease.
              </p>
              <div className="flex items-center gap-3">
                {[
                  { Icon: Facebook, link: "#" },
                  { Icon: Instagram, link: "#" },
                  { Icon: Linkedin, link: "#" },
                  { Icon: Youtube, link: "#" },
                ].map((social, i) => (
                  <a
                    key={i}
                    href={social.link}
                    className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <social.Icon className="w-4.5 h-4.5" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-slate-900 font-bold mb-5">Product</h4>
              <ul className="space-y-3.5">
                <li>
                  <a
                    href="#features"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <Link
                    to="/integrations"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors"
                  >
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pricing"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    to="/roadmap"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors"
                  >
                    Roadmap
                  </Link>
                </li>
                <li>
                  <Link
                    to="/changelog"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors"
                  >
                    Changelog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-slate-900 font-bold mb-5">Company</h4>
              <ul className="space-y-3.5">
                <li>
                  <Link
                    to="/about-us"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/blog"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    to="/careers"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-slate-900 font-bold mb-5">Legal & Policies</h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/privacy-policy"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors text-sm"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms-of-service"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors text-sm"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    to="/security"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors text-sm"
                  >
                    Security
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cookie-policy"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors text-sm"
                  >
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/data-deletion-policy"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors text-sm"
                  >
                    Data Deletion
                  </Link>
                </li>
                <li>
                  <Link
                    to="/ai-policy"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors text-sm"
                  >
                    AI Ethics Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/acceptable-use"
                    className="text-slate-500 font-medium hover:text-blue-600 transition-colors text-sm"
                  >
                    Acceptable Use
                  </Link>
                </li>
              </ul>
              {(contactEmail || contactPhone) && (
                <div className="mt-6 space-y-2 pt-6 border-t border-slate-100">
                  {contactEmail && (
                    <a
                      href={`mailto:${contactEmail}`}
                      className="flex items-center gap-2 text-slate-500 font-medium hover:text-blue-600 transition-colors text-xs"
                    >
                      <Mail className="w-3.5 h-3.5" /> {contactEmail}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 font-medium text-sm">{footerText}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400">
              <Link to="/privacy-policy" className="hover:text-slate-700 transition-colors">Privacy</Link>
              <span>·</span>
              <Link to="/terms-of-service" className="hover:text-slate-700 transition-colors">Terms</Link>
              <span>·</span>
              <Link to="/security" className="hover:text-slate-700 transition-colors">Security</Link>
              <span>·</span>
              <Link to="/cookie-policy" className="hover:text-slate-700 transition-colors">Cookies</Link>
              {address && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-slate-400 font-normal">
                    <MapPin className="w-3.5 h-3.5" /> {address}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* ─── MOBILE FLOATING NAV (Light Glass) ─── */}
      <div className="md:hidden fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto flex items-center justify-between gap-1 p-2 rounded-full glass-nav border border-slate-200/60 shadow-lg shadow-slate-200/50">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold text-blue-600 bg-blue-50"
          >
            <HomeIcon className="w-4.5 h-4.5" />
            <span>Home</span>
          </button>
          <a
            href="#features"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
          </a>
          <Link
            to="/integrations"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            <Globe className="w-4.5 h-4.5" />
          </Link>
          <button
            onClick={() => goAuth("/register")}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-blue-600 ml-1"
          >
            Start
          </button>
        </nav>
      </div>
    </div>
  );
}

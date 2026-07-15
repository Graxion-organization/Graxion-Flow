import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Brain,
  CheckCircle2,
  Globe,
  Menu,
  MessageSquare,
  Network,
  Shield,
  Sparkles,
  Users,
  Workflow,
  X,
  Zap,
  TrendingUp,
  Star,
  MapPin,
  Code2,
  Cpu,
  Activity,
  Rocket,
  Check,
  Target,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Lock,
  Server,
  UserCheck,
  Key,
  Eye,
  Inbox,
  Send,
  Plus,
  Calendar,
  Settings,
  ShieldAlert,
  Share2
} from "lucide-react";
import { useAuthStore, useBrandingStore } from "../store";

/* ════════════════════════════════════════════════════════════════
   MISSION CONTROL DATA SCHEMAS
   ════════════════════════════════════════════════════════════════ */
const NAV = [
  { label: "Neural Grid", href: "#neural-grid" },
  { label: "Hardware Nodes", href: "#hardware" },
  { label: "Telemetry", href: "#telemetry" },
  { label: "Compute Planner", href: "#planner" },
];

const CONNECTED_PLATFORMS = [
  { name: "Meta Webhook", type: "GATEWAY", latency: "6ms", load: "14%", status: "UPTIME" },
  { name: "WhatsApp Cloud API", type: "BROADCAST", latency: "24ms", load: "32%", status: "UPTIME" },
  { name: "Instagram DM Webhook", type: "ENGAGEMENT", latency: "18ms", load: "21%", status: "UPTIME" },
  { name: "Stripe API Webhook", type: "BILLING", latency: "12ms", load: "8%", status: "UPTIME" },
  { name: "Claude-3.5 Cognitive Node", type: "COMPUTE", latency: "240ms", load: "78%", status: "UPTIME" },
  { name: "HubSpot API Adapter", type: "CRM_SYNC", latency: "84ms", load: "11%", status: "UPTIME" },
  { name: "Slack Event Hub", type: "DISPATCH", latency: "15ms", load: "4%", status: "UPTIME" },
];

const HARDWARE_NODES = [
  {
    id: "cognitive",
    title: "Neural Cognitive Cluster",
    core: "Claude-3.5 / GPT-4o Mix",
    description: "Multi-model orchestration engine. Dynamically routes conversation context to resolve intent, extract deal variables, and process catalogs.",
    icon: Brain,
    color: "#8B5CF6",
    metrics: { load: "62%", temp: "42°C", thread_pool: "512/sec" }
  },
  {
    id: "whatsapp",
    title: "WhatsApp Broadcast Engine",
    core: "Official Meta Gateway",
    description: "High-throughput messaging queue. Manages active pipelines, triggers templates, and streams incoming threads into AI profiling blocks.",
    icon: MessageSquare,
    color: "#10B981",
    metrics: { load: "44%", speed: "148 msg/s", band: "12.4 GB/s" }
  },
  {
    id: "instagram",
    title: "Instagram Hook Listener",
    core: "Graph API Webhook",
    description: "Captures Story replies, post comments, and DMs. Instantly fires qualification routines to capture lead contact points.",
    icon: Share2,
    color: "#EC4899",
    metrics: { load: "28%", socket: "99.98%", queue: "Clear" }
  },
  {
    id: "enrichment",
    title: "Prospect Intel Processor",
    core: "Real-time Enrichment API",
    description: "Validates inbound streams. Extracts enterprise records, matches phone details, checks email servers, and profiles buyer intent.",
    icon: Target,
    color: "#00F2FE",
    metrics: { load: "12%", match_rate: "94.2%", delay: "0.8s" }
  },
  {
    id: "crm",
    title: "Bi-Directional CRM Gateway",
    core: "OAuth Hubspot / Zoho Adapters",
    description: "Syncs qualified contacts, builds deal cards, updates client properties, and triggers internal automation cycles on customer events.",
    icon: Workflow,
    color: "#F59E0B",
    metrics: { load: "18%", delay: "0.2s", queue_buffer: "0" }
  },
  {
    id: "publishing",
    title: "Campaign Scheduling Hub",
    core: "Queue Dispatch Manager",
    description: "Deploys multi-platform marketing assets. AI schedule adjustments dispatch campaigns when target audience engagement is peak.",
    icon: Calendar,
    color: "#06B6D4",
    metrics: { load: "6%", active_jobs: "12", cache: "Stable" }
  }
];

const MOCK_LEADS_QUEUE = [
  { id: 1, name: "Sarah Jenkins", channel: "Instagram DM", email: "sarah@growthtech.io", query: "Can we integrate this into HubSpot directly?", platform: "instagram" },
  { id: 2, name: "Arjun Mehta", channel: "WhatsApp Inbound", email: "arjun@mehtacorp.com", query: "Looking for API pricing details for 40 seats.", platform: "whatsapp" },
  { id: 3, name: "Carlos Alvarez", channel: "Stripe Webhook", email: "carlos@finpay.es", query: "Trial upgraded to premium Growth cluster.", platform: "stripe" },
  { id: 4, name: "Emily Robinson", channel: "Email Outbox", email: "emily@robinsondev.net", query: "Demo request for role-based governance nodes.", platform: "email" },
  { id: 5, name: "Yuki Tanaka", channel: "WhatsApp Broadcast", email: "yuki@tanakatech.jp", query: "Opted-in to beta developer SDK release.", platform: "whatsapp" }
];

const FAQ_DATABASE = [
  {
    q: "Is WhatsAgent.os Meta API Compliant?",
    a: "Absolutely. WhatsAgent.os routes all WhatsApp and Instagram requests directly through Meta's Official Cloud API nodes. Security guidelines and connection parameters strictly match compliance profiles to ensure zero account suspensions."
  },
  {
    q: "How does the lead enrichment engine function?",
    a: "When an inbound webhook fires, our intelligence block queries verified enterprise databases to identify company profile size, budget parameters, and business domain, populating fields instantly in your linked CRM."
  },
  {
    q: "Can we deploy local hosting models?",
    a: "Yes. For custom enterprise tiers, WhatsAgent.os support dedicated Docker core containers, hosting dedicated LLM weights, localized databases, and private API gateways."
  },
  {
    q: "How are cluster compute tokens measured?",
    a: "Credits are calculated on successfully executed automation runs, model tokens consumed, and API integrations. The compute planner helps customize capacity parameters based on predicted transaction pipelines."
  }
];

export default function Home() {
  const navigate = useNavigate();
  const { branding, fetchBranding } = useBrandingStore();
  const { isAuthenticated } = useAuthStore();

  const brand = useMemo(() => branding?.branding_site_name || "WhatsAgent", [branding]);

  // Dark/Light Theme Settings
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("app-theme") || "dark";
  });
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    fetchBranding().catch(() => {});
  }, [fetchBranding]);

  useEffect(() => {
    document.title = `${brand}.os — Immersive AI Automation Command Center`;
  }, [brand]);

  const goAuth = (path) => {
    if (isAuthenticated) {
      navigate("/app/dashboard");
    } else {
      navigate(path);
    }
  };

  /* ════════════════════════════════════════════════════════════════
     HERO CORE STATES: LEAD SIMULATION CONTROL DECK
     ════════════════════════════════════════════════════════════════ */
  const [leadQueue, setLeadQueue] = useState(MOCK_LEADS_QUEUE);
  const [selectedLead, setSelectedLead] = useState(null);
  const [pipelineState, setPipelineState] = useState("IDLE"); // IDLE, INBOUND, CLASSIFY, COGNITION, CRM_SYNC, SUCCESS
  const [autopilotMode, setAutopilotMode] = useState(true);
  const [terminalLogs, setTerminalLogs] = useState([
    { type: "sys", time: "18:12:01", text: "SYSTEM STATUS: OPERATIONAL. Ready for lead injection." },
    { type: "sys", time: "18:12:02", text: "All neural routes mapped. Sockets online (Port 443)." }
  ]);
  const [customTerminalInput, setCustomTerminalInput] = useState("");

  // Periodically inject mock events if autopilot is true
  useEffect(() => {
    if (!autopilotMode) return;
    let index = 0;
    const interval = setInterval(() => {
      const targetLead = MOCK_LEADS_QUEUE[index % MOCK_LEADS_QUEUE.length];
      triggerSimulation(targetLead);
      index++;
    }, 7000);
    return () => clearInterval(interval);
  }, [autopilotMode]);

  const triggerSimulation = (lead) => {
    setSelectedLead(lead);
    
    // Clear logs for fresh run
    const timestamp = new Date().toLocaleTimeString("en-IN", { hour12: false });
    setTerminalLogs([
      { type: "sys", time: timestamp, text: `Starting process pipeline for lead: ${lead.name}` },
      { type: "input", time: timestamp, text: `INBOUND EVENT [${lead.channel.toUpperCase()}] triggered.` }
    ]);

    // Stage 1: Inbound
    setPipelineState("INBOUND");
    
    // Stage 2: Intent Classifier
    setTimeout(() => {
      setPipelineState("CLASSIFY");
      const ts = new Date().toLocaleTimeString("en-IN", { hour12: false });
      setTerminalLogs(prev => [
        ...prev,
        { type: "out", time: ts, text: `[INTENT_RESOLVER] Parsing query: "${lead.query}"` },
        { type: "out", time: ts, text: `[INTENT_RESOLVER] Matching routing rules. Classification confidence: 99.4%` }
      ]);
    }, 1000);

    // Stage 3: Cognitive Agent Core
    setTimeout(() => {
      setPipelineState("COGNITION");
      const ts = new Date().toLocaleTimeString("en-IN", { hour12: false });
      setTerminalLogs(prev => [
        ...prev,
        { type: "cognitive", time: ts, text: `[NEURAL_AGENT] Context dispatched to Claude-3.5-Sonnet.` },
        { type: "cognitive", time: ts, text: `[NEURAL_AGENT] Profile resolved: budget_indicator="Medium", urgency="High".` },
        { type: "cognitive", time: ts, text: `[NEURAL_AGENT] Drafted personalized follow-up email/message.` }
      ]);
    }, 2200);

    // Stage 4: Sync & Dispatch
    setTimeout(() => {
      setPipelineState("CRM_SYNC");
      const ts = new Date().toLocaleTimeString("en-IN", { hour12: false });
      setTerminalLogs(prev => [
        ...prev,
        { type: "sync", time: ts, text: `[API_ADAPTER] Contact record compiled: ${lead.email}` },
        { type: "sync", time: ts, text: `[API_ADAPTER] HubSpot Deal card injected (Stage: QUALIFIED).` },
        { type: "sync", time: ts, text: `[API_ADAPTER] Slack notification dispatched to channel #sales-leads.` }
      ]);
    }, 3500);

    // Stage 5: Success
    setTimeout(() => {
      setPipelineState("SUCCESS");
      const ts = new Date().toLocaleTimeString("en-IN", { hour12: false });
      setTerminalLogs(prev => [
        ...prev,
        { type: "success", time: ts, text: `[PIPELINE_COMPLETE] Lead processed autonomously in 4.2 seconds.` }
      ]);
    }, 4500);
  };

  const handleCustomCommandSubmit = (e) => {
    e.preventDefault();
    if (!customTerminalInput.trim()) return;
    const text = customTerminalInput.trim();
    const ts = new Date().toLocaleTimeString("en-IN", { hour12: false });
    
    setTerminalLogs(prev => [...prev, { type: "input", time: ts, text }]);
    setCustomTerminalInput("");

    setTimeout(() => {
      if (text.toLowerCase() === "help") {
        setTerminalLogs(prev => [
          ...prev,
          { type: "out", time: ts, text: "Available CLI scripts: autopilot_on, autopilot_off, inject_lead, clear_shell" }
        ]);
      } else if (text.toLowerCase() === "autopilot_on") {
        setAutopilotMode(true);
        setTerminalLogs(prev => [...prev, { type: "success", time: ts, text: "AUTOPILOT_RUN enabled globally." }]);
      } else if (text.toLowerCase() === "autopilot_off") {
        setAutopilotMode(false);
        setTerminalLogs(prev => [...prev, { type: "success", time: ts, text: "AUTOPILOT_RUN suspended. Awaiting manual trigger." }]);
      } else if (text.toLowerCase() === "inject_lead") {
        const rand = MOCK_LEADS_QUEUE[Math.floor(Math.random() * MOCK_LEADS_QUEUE.length)];
        triggerSimulation(rand);
      } else if (text.toLowerCase() === "clear_shell") {
        setTerminalLogs([]);
      } else {
        setTerminalLogs(prev => [
          ...prev,
          { type: "error", time: ts, text: `Command execution failed: "${text}". Type help for available routines.` }
        ]);
      }
    }, 400);
  };

  /* ════════════════════════════════════════════════════════════════
     TELEMETRY PANEL TAB STATE (SECTION 4)
     ════════════════════════════════════════════════════════════════ */
  const [activeTelemetryTab, setActiveTelemetryTab] = useState("builder");
  const [activeWorkspaceStep, setActiveWorkspaceStep] = useState(0);

  // Live Socket Transcripts
  const [mockTranscripts, setMockTranscripts] = useState([
    { id: 1, name: "Kunal R.", channel: "WhatsApp", text: "Is support included in standard growth grids?", age: "Just now", status: "AI_REPLYING" },
    { id: 2, name: "Marie S.", channel: "Instagram", text: "Awesome! Let me book the demo time slot.", age: "1 min ago", status: "COMPLETED" },
    { id: 3, name: "Steve G.", channel: "Telegram", text: "Wait, does it sync with Salesforce Custom Objects?", age: "4 mins ago", status: "ROUTED_TO_HUMAN" }
  ]);

  // Simulating random new incoming chats to make Dashboard feel alive
  useEffect(() => {
    const chatQueries = [
      "I need a quote for custom weights on Claude-3.5.",
      "How secure are CRM credentials at rest?",
      "Can I trigger broadcast campaigns dynamically via API?",
      "What is the average latency for webhook handshakes?"
    ];
    const names = ["Aarav N.", "Chloe D.", "Lucas W.", "Rhea P."];
    const platforms = ["WhatsApp", "Instagram", "Telegram"];

    const interval = setInterval(() => {
      const randomChat = {
        id: Date.now(),
        name: names[Math.floor(Math.random() * names.length)],
        channel: platforms[Math.floor(Math.random() * platforms.length)],
        text: chatQueries[Math.floor(Math.random() * chatQueries.length)],
        age: "Just now",
        status: "AI_REPLYING"
      };
      setMockTranscripts(prev => [randomChat, ...prev.slice(0, 2)]);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  /* ════════════════════════════════════════════════════════════════
     RESOURCE ALLOCATION SLIDER (SECTION 8)
     ════════════════════════════════════════════════════════════════ */
  const [computeClusters, setComputeClusters] = useState(4); // Slider range 1-20
  const billingCalculations = useMemo(() => {
    const costPerCluster = 999; // Price in INR
    const totalCost = computeClusters * costPerCluster;
    const capacityTransactions = computeClusters * 15000;
    const activePipelineLimit = computeClusters * 3;
    const deflectionRating = computeClusters <= 3 ? "Standard Core" : computeClusters <= 10 ? "Accelerated Cluster" : "Dedicated Neural Node Instance";
    return { totalCost, capacityTransactions, activePipelineLimit, deflectionRating };
  }, [computeClusters]);

  // FAQ Accordion State
  const [openFaqIdx, setOpenFaqIdx] = useState(null);

  // Mobile drawer State
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${
        isDark ? "bg-[#030508] text-slate-100" : "bg-[#F3F4F6] text-slate-900"
      }`}
    >
      {/* ── ALIVE SYSTEM CUSTOM CSS STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&family=Share+Tech+Mono&display=swap');
        .jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .body-font { font-family: 'Inter', sans-serif; }
        .tech-mono { font-family: 'Share Tech Mono', monospace; }
        
        .cyber-grid {
          background-image: ${
            isDark
              ? "radial-gradient(rgba(255,106,0,0.06) 1px, transparent 1px)"
              : "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)"
          };
          background-size: 24px 24px;
        }

        .hud-border {
          border: 1px solid ${
            isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.06)"
          };
        }

        .glow-card {
          background: ${
            isDark ? "rgba(6, 8, 14, 0.85)" : "rgba(255, 255, 255, 0.9)"
          };
          border: 1px solid ${
            isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)"
          };
          box-shadow: ${
            isDark ? "0 10px 40px rgba(0, 0, 0, 0.7)" : "0 10px 40px rgba(0, 0, 0, 0.03)"
          };
        }

        .glow-active-node {
          filter: drop-shadow(0 0 12px currentColor);
        }

        @keyframes flow-particles {
          to {
            stroke-dashoffset: -80;
          }
        }

        .flow-path-active {
          stroke-dasharray: 10, 15;
          animation: flow-particles 1.2s linear infinite;
        }

        /* Scanline animation for monitor cards */
        .scanlines {
          position: relative;
          overflow: hidden;
        }
        .scanlines::before {
          content: " ";
          display: block;
          position: absolute;
          top: 0; left: 0; bottom: 0; right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.15) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
          z-index: 10;
          background-size: 100% 3px, 3px 100%;
          pointer-events: none;
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════
          HEADER NAVIGATION HUD
      ══════════════════════════════════════════════════════════════ */}
      <header
        className={`sticky top-0 z-50 w-full border-b backdrop-blur-md transition-colors duration-300 ${
          isDark
            ? "bg-[#030508]/85 border-white/5"
            : "bg-[#F3F4F6]/85 border-slate-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#FF6A00] to-[#F97316] flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Cpu size={18} className="animate-spin-slow" />
            </div>
            <div className="text-left leading-none">
              <span className="jakarta font-black text-xl tracking-tight bg-gradient-to-r from-[#FF6A00] via-[#F97316] to-[#EC4899] bg-clip-text text-transparent block">
                {brand}.os
              </span>
              <span className="text-[8px] font-bold tracking-widest tech-mono text-slate-500 uppercase">
                VERSION 4.8.2-NEURAL
              </span>
            </div>
          </Link>

          {/* Central System Specs Ticker */}
          <div className="hidden lg:flex items-center gap-6 text-[10px] font-bold tech-mono text-slate-400 border-l border-r border-slate-500/10 px-6 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>SYS_TEMP: 41°C</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>CPU_LOAD: 28%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>SOCKETS: 1,482/s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#FF6A00]">DEFLECTION: 78.4%</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-wider tech-mono">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className={`transition-colors duration-200 ${
                  isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {n.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all ${
                isDark
                  ? "border-white/5 bg-white/5 text-yellow-400 hover:bg-white/10"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button
              onClick={() => goAuth("/login")}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all uppercase tracking-wider tech-mono ${
                isDark
                  ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              ./connect_operator
            </button>

            <button
              onClick={() => goAuth("/register")}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#FF6A00] to-[#F97316] hover:brightness-105 transition-all shadow-md shadow-orange-500/10 uppercase tracking-wider tech-mono flex items-center gap-1.5"
            >
              SYS_INIT <ArrowRight size={13} />
            </button>
          </div>

          {/* Mobile hamburger menu */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border ${
                isDark ? "border-white/5 bg-white/5" : "border-slate-200 bg-slate-50"
              }`}
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              className={`p-2 rounded-lg border ${
                isDark ? "border-white/10 text-slate-300" : "border-slate-200 text-slate-700"
              }`}
            >
              {mobileDrawerOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        <AnimatePresence>
          {mobileDrawerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`md:hidden overflow-hidden border-t ${
                isDark ? "border-white/5 bg-[#030508]" : "border-slate-200 bg-[#F3F4F6]"
              }`}
            >
              <div className="px-6 py-5 flex flex-col gap-4 text-left">
                {NAV.map((n) => (
                  <a
                    key={n.href}
                    href={n.href}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`text-xs font-bold uppercase tracking-wider tech-mono py-2 ${
                      isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {n.label}
                  </a>
                ))}
                <div className="h-px bg-slate-500/10 my-2" />
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    goAuth("/login");
                  }}
                  className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider tech-mono border ${
                    isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  ./connect_operator
                </button>
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    goAuth("/register");
                  }}
                  className="w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider tech-mono text-white bg-gradient-to-r from-[#FF6A00] to-[#F97316]"
                >
                  SYS_INIT
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1: THE MISSION CONTROL CORE HERO
      ══════════════════════════════════════════════════════════════ */}
      <section
        id="neural-grid"
        className="cyber-grid relative pt-8 pb-24 md:py-20 border-b overflow-hidden"
        style={{ borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)" }}
      >
        {/* Glow ambient background lights */}
        <div className="absolute top-1/4 left-1/4 h-[350px] w-[350px] rounded-full bg-[#FF6A00]/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-[#8B5CF6]/5 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10">
          
          {/* Left Control Panel: System Initialization and HUD (Col-span 4) */}
          <div className="lg:col-span-4 flex flex-col justify-between text-left relative glow-card rounded-2xl p-6 border overflow-hidden scanlines">
            <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-[#FF6A00] to-[#8B5CF6] h-[2px]" />
            
            <div>
              {/* Telemetry alert indicator */}
              <div className="flex items-center justify-between border-b border-slate-500/10 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-ping" />
                  <span className="text-[10px] font-extrabold tech-mono tracking-widest text-[#FF6A00] uppercase">
                    SYS_CORE: DEACTIVE_AWAITING_INJECT
                  </span>
                </div>
                <div className="flex items-center gap-1 border border-slate-500/20 bg-slate-500/5 px-2 py-0.5 rounded text-[8px] font-bold tech-mono">
                  <span>AUTOPILOT:</span>
                  <span className={autopilotMode ? "text-emerald-500" : "text-slate-400"}>
                    {autopilotMode ? "ON" : "OFF"}
                  </span>
                </div>
              </div>

              {/* Unique Headline Design */}
              <div className="tech-mono text-[9px] text-[#FF6A00] font-bold tracking-widest mb-1">
                // SYSTEM_ORCHESTRATION_FRAMEWORK
              </div>
              <h1 className="jakarta font-black text-3xl sm:text-[36px] leading-tight tracking-tight uppercase mb-4">
                Run Your Entire <br />
                <span className="bg-gradient-to-r from-[#FF6A00] via-[#F97316] to-[#8B5CF6] bg-clip-text text-transparent">
                  Business Autonomously
                </span>
              </h1>
              
              <p className={`body-font text-xs leading-relaxed mb-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                WhatsAgent.os constructs a unified mission control deck across communication webhooks, cognitive routing hubs, and production databases.
              </p>

              {/* Lead Injection Control Deck */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest tech-mono block">
                    INBOUND_LEADS_QUEUE
                  </span>
                  <button
                    onClick={() => setAutopilotMode(!autopilotMode)}
                    className={`text-[8px] font-bold tech-mono uppercase px-2 py-0.5 rounded border transition-all ${
                      autopilotMode
                        ? "bg-orange-500/10 border-orange-500/30 text-[#FF6A00]"
                        : "bg-slate-500/5 border-slate-500/20 text-slate-400"
                    }`}
                  >
                    {autopilotMode ? "Stop Autopilot" : "Resume Autopilot"}
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {leadQueue.map((lead) => {
                    const isProcessing = selectedLead?.id === lead.id;
                    return (
                      <button
                        key={lead.id}
                        onClick={() => {
                          setAutopilotMode(false);
                          triggerSimulation(lead);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs tech-mono ${
                          isProcessing
                            ? "border-[#FF6A00] bg-orange-500/5 glow-orange"
                            : isDark
                            ? "border-white/5 bg-white/[0.01] hover:bg-white/5 text-slate-400 hover:text-white"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isProcessing ? "bg-[#FF6A00] animate-ping" : "bg-slate-500"
                          }`} />
                          <div className="truncate">
                            <span className="font-bold block text-[10px] text-slate-300">{lead.name}</span>
                            <span className="text-[8px] opacity-65 font-normal block truncate">{lead.query}</span>
                          </div>
                        </div>
                        <span className={`text-[8px] font-bold uppercase shrink-0 px-1.5 py-0.5 rounded ml-2 ${
                          lead.platform === "whatsapp"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : lead.platform === "instagram"
                            ? "bg-pink-500/10 text-pink-500 border border-pink-500/20"
                            : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        }`}>
                          {lead.platform}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Diagnostics triggers / status prompts */}
            <div className="border-t border-slate-500/10 pt-4 flex items-center gap-3">
              <button
                onClick={() => goAuth("/register")}
                className="flex-1 py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#FF6A00] to-[#F97316] hover:brightness-105 shadow-md shadow-orange-500/15 tech-mono text-center"
              >
                SYS_BOOT_CLUSTER
              </button>
              <button
                onClick={() => navigate("/contact")}
                className={`py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider border tech-mono transition-all ${
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                OPERATOR_SYS_CALL
              </button>
            </div>
          </div>

          {/* Right Network Canvas & Telemetry Shell console (Col-span 8) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            {/* Massive SVG Network grid canvas visualization */}
            <div className="flex-1 min-h-[360px] glow-card rounded-2xl p-6 border relative overflow-hidden flex flex-col justify-between">
              
              {/* Background Network Graph lines */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 800 350" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="flowOrange" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FF6A00" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="flowCyan" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#00F2FE" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="flowGreen" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>

                  {/* Static connector backgrounds */}
                  <g stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)"} strokeWidth="1.5" fill="none">
                    {/* Level 1 -> Level 2 */}
                    <path d="M 100 60 L 300 175" />
                    <path d="M 100 175 L 300 175" />
                    <path d="M 100 290 L 300 175" />
                    {/* Level 2 -> Level 3 */}
                    <path d="M 300 175 L 500 90" />
                    <path d="M 300 175 L 500 260" />
                    {/* Level 3 -> Level 4 */}
                    <path d="M 500 90 L 700 60" />
                    <path d="M 500 90 L 700 175" />
                    <path d="M 500 260 L 700 175" />
                    <path d="M 500 260 L 700 290" />
                  </g>

                  {/* Dynamic animating pipeline data routes */}
                  <g fill="none" strokeWidth="2" strokeLinecap="round">
                    {/* WhatsApp/IG -> Intent Classifier */}
                    <path
                      d="M 100 175 L 300 175"
                      stroke="url(#flowOrange)"
                      className={pipelineState === "INBOUND" ? "flow-path-active" : "opacity-10"}
                    />
                    <path
                      d="M 100 60 L 300 175"
                      stroke="url(#flowOrange)"
                      className={(pipelineState === "INBOUND" && selectedLead?.platform === "instagram") ? "flow-path-active" : "opacity-10"}
                    />
                    <path
                      d="M 100 290 L 300 175"
                      stroke="url(#flowOrange)"
                      className={(pipelineState === "INBOUND" && selectedLead?.platform === "stripe") ? "flow-path-active" : "opacity-10"}
                    />

                    {/* Intent Classifier -> Cognitive Core */}
                    <path
                      d="M 300 175 L 500 90"
                      stroke="url(#flowCyan)"
                      className={pipelineState === "CLASSIFY" ? "flow-path-active" : "opacity-10"}
                    />
                    {/* Intent Classifier -> Stripe/Billing Core */}
                    <path
                      d="M 300 175 L 500 260"
                      stroke="url(#flowCyan)"
                      className={pipelineState === "CLASSIFY" ? "flow-path-active" : "opacity-10"}
                    />

                    {/* Cognitive Core -> HubSpot CRM / Slack */}
                    <path
                      d="M 500 90 L 700 60"
                      stroke="url(#flowGreen)"
                      className={pipelineState === "COGNITION" ? "flow-path-active" : "opacity-10"}
                    />
                    <path
                      d="M 500 90 L 700 175"
                      stroke="url(#flowGreen)"
                      className={pipelineState === "COGNITION" ? "flow-path-active" : "opacity-10"}
                    />
                    {/* Stripe/Billing -> Slack / Mailgun */}
                    <path
                      d="M 500 260 L 700 175"
                      stroke="url(#flowGreen)"
                      className={pipelineState === "CRM_SYNC" ? "flow-path-active" : "opacity-10"}
                    />
                    <path
                      d="M 500 260 L 700 290"
                      stroke="url(#flowGreen)"
                      className={pipelineState === "CRM_SYNC" ? "flow-path-active" : "opacity-10"}
                    />
                  </g>
                </svg>
              </div>

              {/* Overlay HUD system title */}
              <div className="flex items-center justify-between border-b border-slate-500/10 pb-3 mb-6 relative z-10">
                <div className="flex items-center gap-2">
                  <Network size={14} className="text-[#FF6A00]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest tech-mono">
                    LIVE AUTOMATION PATHWAY MONITOR
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[9px] font-bold tech-mono text-emerald-500">SYS_VOLTAGE: OK</span>
                </div>
              </div>

              {/* Physical Nodes rendered in Grid coordinates */}
              <div className="grid grid-cols-4 items-center gap-4 relative z-10 flex-1 py-4">
                
                {/* Column 1: Inbounds */}
                <div className="flex flex-col gap-6 justify-center">
                  {/* IG Node */}
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                    (pipelineState === "INBOUND" && selectedLead?.platform === "instagram")
                      ? "border-pink-500/50 bg-pink-500/5 text-pink-400 glow-active-node"
                      : "border-slate-500/10 bg-slate-500/[0.02] text-slate-500"
                  }`}>
                    <Share2 size={16} />
                    <div className="text-left font-bold tech-mono text-[9px] leading-none">
                      <span>INSTAGRAM_IN</span>
                      <span className="block text-[8px] font-normal opacity-70">PORT: 8081</span>
                    </div>
                  </div>
                  {/* WhatsApp Node */}
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                    (pipelineState === "INBOUND" && selectedLead?.platform === "whatsapp")
                      ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-400 glow-active-node"
                      : "border-slate-500/10 bg-slate-500/[0.02] text-slate-500"
                  }`}>
                    <MessageSquare size={16} />
                    <div className="text-left font-bold tech-mono text-[9px] leading-none">
                      <span>WHATSAPP_GATE</span>
                      <span className="block text-[8px] font-normal opacity-70">PORT: 8082</span>
                    </div>
                  </div>
                  {/* Stripe Hook Node */}
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                    (pipelineState === "INBOUND" && selectedLead?.platform === "stripe")
                      ? "border-cyan-500/50 bg-cyan-500/5 text-cyan-400 glow-active-node"
                      : "border-slate-500/10 bg-slate-500/[0.02] text-slate-500"
                  }`}>
                    <Zap size={16} />
                    <div className="text-left font-bold tech-mono text-[9px] leading-none">
                      <span>STRIPE_HOOK</span>
                      <span className="block text-[8px] font-normal opacity-70">PORT: 8083</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Router */}
                <div className="flex flex-col justify-center">
                  <div className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                    pipelineState === "CLASSIFY"
                      ? "border-purple-500/50 bg-purple-500/5 text-purple-400 glow-active-node"
                      : "border-slate-500/10 bg-slate-500/[0.02] text-slate-500"
                  }`}>
                    <Brain size={22} className={pipelineState === "CLASSIFY" ? "animate-pulse" : ""} />
                    <div className="font-bold tech-mono text-[9px] leading-none">
                      <span>INTENT_CLASSIFY</span>
                      <span className="block text-[8px] font-normal opacity-70 mt-1">LLM_CLASSIFIER</span>
                    </div>
                  </div>
                </div>

                {/* Column 3: AI Cognitive Processor */}
                <div className="flex flex-col gap-8 justify-center">
                  {/* Neural Agent */}
                  <div className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                    pipelineState === "COGNITION"
                      ? "border-[#FF6A00]/50 bg-[#FF6A00]/5 text-[#FF6A00] glow-active-node"
                      : "border-slate-500/10 bg-slate-500/[0.02] text-slate-500"
                  }`}>
                    <Bot size={22} />
                    <div className="font-bold tech-mono text-[9px] leading-none">
                      <span>PROFILER_AGENT</span>
                      <span className="block text-[8px] font-normal opacity-70 mt-1">CLAUDE_3.5_CORE</span>
                    </div>
                  </div>
                  {/* Database Adapter */}
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                    pipelineState === "CRM_SYNC"
                      ? "border-cyan-500/50 bg-cyan-500/5 text-cyan-400 glow-active-node"
                      : "border-slate-500/10 bg-slate-500/[0.02] text-slate-500"
                  }`}>
                    <Server size={14} />
                    <div className="text-left font-bold tech-mono text-[9px] leading-none">
                      <span>DB_CACHE</span>
                      <span className="block text-[8px] font-normal opacity-70">REDIS_SYNC</span>
                    </div>
                  </div>
                </div>

                {/* Column 4: Outbound Systems */}
                <div className="flex flex-col gap-6 justify-center">
                  {/* HubSpot CRM */}
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                    pipelineState === "SUCCESS"
                      ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-400 glow-active-node"
                      : "border-slate-500/10 bg-slate-500/[0.02] text-slate-500"
                  }`}>
                    <Workflow size={15} />
                    <div className="text-left font-bold tech-mono text-[9px] leading-none">
                      <span>HUBSPOT_CRM</span>
                      <span className="block text-[8px] font-normal opacity-70">API_SUCCESS</span>
                    </div>
                  </div>
                  {/* Slack Alerts */}
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                    pipelineState === "SUCCESS"
                      ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-400 glow-active-node"
                      : "border-slate-500/10 bg-slate-500/[0.02] text-slate-500"
                  }`}>
                    <Send size={15} />
                    <div className="text-left font-bold tech-mono text-[9px] leading-none">
                      <span>SLACK_DISPATCH</span>
                      <span className="block text-[8px] font-normal opacity-70">WEBHOOK_OK</span>
                    </div>
                  </div>
                  {/* Email Outbox */}
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                    pipelineState === "SUCCESS"
                      ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-400 glow-active-node"
                      : "border-slate-500/10 bg-slate-500/[0.02] text-slate-500"
                  }`}>
                    <Plus size={15} />
                    <div className="text-left font-bold tech-mono text-[9px] leading-none">
                      <span>MAILGUN_OUT</span>
                      <span className="block text-[8px] font-normal opacity-70">SMTP_SUCCESS</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Diagnostic Logs console CLI */}
            <div className="h-[140px] rounded-2xl border text-left flex flex-col bg-[#04060A]/90 border-white/5 relative overflow-hidden scanlines">
              <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between bg-black/45 shrink-0">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                  <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                </div>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest tech-mono">
                  whatsagent_diagnostics_console.sh
                </span>
              </div>

              <div className="p-4 flex-1 overflow-y-auto font-mono text-[10px] leading-relaxed flex flex-col gap-1 text-slate-400">
                {terminalLogs.map((log, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-[#FF6A00] shrink-0 font-bold text-[9px]">{`[${log.time}] $`}</span>
                    <p className={
                      log.type === "error" ? "text-rose-400" :
                      log.type === "success" ? "text-emerald-400" :
                      log.type === "cognitive" ? "text-purple-400" :
                      log.type === "sync" ? "text-cyan-400" : "text-slate-300"
                    }>
                      {log.text}
                    </p>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleCustomCommandSubmit}
                className="px-4 py-1.5 border-t border-white/5 flex gap-2 items-center bg-black/15 shrink-0"
              >
                <span className="text-[#FF6A00] font-mono text-xs font-bold">$</span>
                <input
                  type="text"
                  placeholder="Execute CLI script (e.g. inject_lead, autopilot_off)..."
                  value={customTerminalInput}
                  onChange={(e) => setCustomTerminalInput(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:outline-none font-mono text-[11px] text-white"
                />
                <button type="submit" className="text-slate-500 hover:text-white transition-colors">
                  <Send size={11} />
                </button>
              </form>
            </div>

          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2: CONNECTED PLATFORMS MARQUEE BAND
      ══════════════════════════════════════════════════════════════ */}
      <section
        className={`py-6 border-b overflow-x-auto ${
          isDark ? "bg-[#04060A] border-white/5" : "bg-slate-50 border-slate-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-8 min-w-[960px]">
          <div className="flex items-center gap-3 shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest tech-mono text-slate-500">
              CLUSTER GATEWAYS CONNECTED
            </span>
          </div>

          <div className="flex items-center gap-8 text-[9px] font-bold tech-mono">
            {CONNECTED_PLATFORMS.map((platform, idx) => (
              <div key={idx} className="flex items-center gap-2 opacity-65 hover:opacity-100 transition-opacity">
                <span className="text-slate-400">{platform.name}</span>
                <span className="text-[8px] bg-slate-500/10 px-1.5 py-0.5 rounded text-slate-500">{platform.type}</span>
                <span className="text-emerald-500">{platform.latency}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3: HARDWARE INTERFACE MONITORS (FEATURES GRID)
      ══════════════════════════════════════════════════════════════ */}
      <section id="hardware" className="py-24 max-w-7xl mx-auto px-6 text-center">
        <div className="max-w-3xl mx-auto mb-16">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border mb-4 text-[9px] font-bold tracking-widest uppercase tech-mono ${
            isDark ? "border-purple-500/30 bg-purple-500/10 text-purple-400" : "border-purple-500/20 bg-purple-500/5 text-purple-600"
          }`}>
            HARDWARE ARCHITECTURE
          </div>
          <h2 className="jakarta font-black text-3xl sm:text-4xl tracking-tight mb-4 uppercase">
            Active System Modules
          </h2>
          <p className={`body-font text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Each dedicated node processes high-throughput business data cycles with real-time hardware latency checks.
          </p>
        </div>

        {/* 3-Column Node Monitor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {HARDWARE_NODES.map((node) => {
            const Icon = node.icon;
            return (
              <div
                key={node.id}
                className="glow-card rounded-2xl p-6 text-left border relative overflow-hidden scanlines flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 left-0 h-[2px] opacity-75" style={{ background: node.color }} />
                
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center border"
                      style={{ borderColor: `${node.color}35`, background: `${node.color}08`, color: node.color }}
                    >
                      <Icon size={18} />
                    </div>
                    <span className="text-[9px] font-extrabold uppercase tech-mono bg-slate-500/10 px-2 py-0.5 rounded text-slate-400">
                      {node.core}
                    </span>
                  </div>

                  <h3 className="jakarta font-black text-sm uppercase tracking-wide mb-3">{node.title}</h3>
                  <p className={`body-font text-xs leading-relaxed mb-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {node.description}
                  </p>
                </div>

                <div className="border-t border-slate-500/10 pt-4">
                  <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest tech-mono block mb-2">
                    HARDWARE_TELEMETRY
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-[9px] font-bold tech-mono text-slate-400 uppercase">
                    {Object.entries(node.metrics).map(([key, val]) => (
                      <div key={key}>
                        <span className="opacity-55 block">{key}:</span>
                        <span className="text-white mt-0.5 block">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 4: UNIFIED TELEMETRY WORKSPACE (PRODUCT PANEL SHOWCASE)
      ══════════════════════════════════════════════════════════════ */}
      <section id="telemetry" className="py-20 border-y" style={{ borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto mb-16">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border mb-4 text-[9px] font-bold tracking-widest uppercase tech-mono ${
              isDark ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400" : "border-cyan-500/20 bg-cyan-500/5 text-cyan-600"
            }`}>
              OPERATOR WORKSPACE
            </div>
            <h2 className="jakarta font-black text-3xl sm:text-4xl tracking-tight mb-4 uppercase">
              Command Center Workspace
            </h2>
            <p className={`body-font text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Access active builder canvases, review socket inquiries, and analyze network CPU workloads.
            </p>
          </div>

          {/* Tabbed workspace board */}
          <div className="glow-card rounded-2xl overflow-hidden border">
            
            {/* Header selector bars */}
            <div className={`px-6 py-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between ${
              isDark ? "bg-[#06090F]/70 border-white/5" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span className="text-[10px] font-bold uppercase tracking-widest tech-mono text-slate-500 ml-4">
                  workspace_console_terminal.bin
                </span>
              </div>

              {/* Tab options */}
              <div className="flex bg-slate-500/10 rounded-lg p-1 text-[11px] font-bold tech-mono">
                {[
                  { id: "builder", label: "NODE_BUILDER.SH" },
                  { id: "stream", label: "SOCKET_MONITOR.SH" },
                  { id: "analytics", label: "CPU_ANALYTICS.SH" }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTelemetryTab(t.id)}
                    className={`px-3 py-1.5 rounded-md transition-all ${
                      activeTelemetryTab === t.id
                        ? "bg-[#FF6A00] text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Display contents */}
            <div className={`p-6 min-h-[380px] text-left transition-colors duration-300 ${
              isDark ? "bg-[#04060a]/95" : "bg-white"
            }`}>
              
              {/* TAB 1: Node Builder */}
              {activeTelemetryTab === "builder" && (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b pb-3 border-slate-500/10">
                    <div className="flex items-center gap-2">
                      <Workflow size={14} className="text-[#FF6A00]" />
                      <span className="text-[11px] font-extrabold uppercase tracking-widest tech-mono text-slate-300">
                        Logic Pipeline Constructor Grid
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold tech-mono">STATUS: COMPILED</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-4 py-4">
                    {/* Node 1 */}
                    <div className="p-4 rounded-xl border border-slate-500/10 bg-slate-500/[0.01] flex flex-col gap-2">
                      <span className="text-[8px] font-bold text-slate-500 tech-mono">TRIGGER</span>
                      <h5 className="font-bold text-xs uppercase">WhatsApp DM</h5>
                      <span className="text-[8px] text-[#10B981] font-bold tech-mono">STATUS_POLL: ACTIVE</span>
                    </div>
                    
                    <ArrowRight className="text-slate-600 mx-auto rotate-90 md:rotate-0" />
                    
                    {/* Node 2 */}
                    <div className="p-4 rounded-xl border border-[#FF6A00]/30 bg-[#FF6A00]/5 flex flex-col gap-2">
                      <span className="text-[8px] font-bold text-[#FF6A00] tech-mono">NEURAL_PROCESSOR</span>
                      <h5 className="font-bold text-xs uppercase">Claude 3.5 Sonnet</h5>
                      <span className="text-[8px] text-[#FF6A00] font-bold tech-mono">LATENCY: 240ms</span>
                    </div>
                    
                    <ArrowRight className="text-slate-600 mx-auto rotate-90 md:rotate-0" />
                    
                    {/* Node 3 */}
                    <div className="p-4 rounded-xl border border-slate-500/10 bg-slate-500/[0.01] flex flex-col gap-2">
                      <span className="text-[8px] font-bold text-slate-500 tech-mono">API_ADAPTER</span>
                      <h5 className="font-bold text-xs uppercase">HubSpot Sync</h5>
                      <span className="text-[8px] text-[#10B981] font-bold tech-mono">SYNC_ROUTE: OK</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Socket Monitor */}
              {activeTelemetryTab === "stream" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Left Chat Stream lists */}
                  <div className="lg:col-span-4 rounded-xl border border-slate-500/10 p-4 flex flex-col gap-3">
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest tech-mono">
                      ACTIVE_CHAT_SOCKETS
                    </span>
                    {mockTranscripts.map((t, idx) => (
                      <div
                        key={t.id}
                        className={`p-3 rounded-lg border flex flex-col gap-1.5 cursor-pointer ${
                          idx === 0
                            ? "border-[#FF6A00]/30 bg-[#FF6A00]/5"
                            : "border-slate-500/10 bg-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-200">{t.name}</span>
                          <span className="text-[9px] text-slate-500 font-normal">{t.age}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{t.text}</p>
                        <div className="flex items-center justify-between mt-1 text-[8px] font-bold tech-mono">
                          <span className="text-[#FF6A00]">{t.channel}</span>
                          <span className="text-emerald-500 uppercase">{t.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right Active Transcript View */}
                  <div className="lg:col-span-8 rounded-xl border border-slate-500/10 p-4 flex flex-col justify-between bg-black/15">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-500/10 pb-3 mb-4 text-[10px] font-bold tech-mono">
                        <span className="text-slate-300">ACTIVE_STREAM_DECK: Kunal R.</span>
                        <span className="text-[#FF6A00]">ROUTING: AUTOMATED_AI</span>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-start">
                          <div className={`max-w-[80%] p-3 rounded-xl text-xs ${
                            isDark ? "bg-white/5 text-slate-300" : "bg-slate-200 text-slate-800"
                          }`}>
                            {mockTranscripts[0]?.text || "Loading queries..."}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <div className="max-w-[80%] p-3 rounded-xl text-xs bg-gradient-to-r from-[#FF6A00] to-[#F97316] text-white">
                            Yes! Every WhatsAgent.os cluster comes with automated support routers linked to live Slack fallback notifications.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-500/10 pt-4 mt-6 flex gap-3 items-center">
                      <input
                        type="text"
                        placeholder="Intercept thread and message manually..."
                        disabled
                        className="flex-1 px-3 py-2 rounded-lg text-xs bg-slate-900 border border-white/5 text-slate-500 cursor-not-allowed"
                      />
                      <button className="px-4 py-2 bg-gradient-to-r from-[#FF6A00] to-[#F97316] text-white text-xs font-bold rounded-lg hover:brightness-105 shrink-0">
                        SYS_OVERRIDE
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CPU Analytics chart */}
              {activeTelemetryTab === "analytics" && (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b pb-3 border-slate-500/10">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={14} className="text-[#FF6A00]" />
                      <span className="text-[11px] font-extrabold uppercase tracking-widest tech-mono text-slate-300">
                        Neural Core Token Workloads
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold tech-mono">UPTIME: 99.99%</span>
                  </div>

                  <div className="h-44 w-full relative flex items-end">
                    <svg viewBox="0 0 700 100" className="w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="areaGradOS" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF6A00" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#FF6A00" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 90 Q 80 40, 160 60 T 320 30 T 480 70 T 600 20 T 700 10 L 700 100 L 0 100 Z"
                        fill="url(#areaGradOS)"
                      />
                      <path
                        d="M 0 90 Q 80 40, 160 60 T 320 30 T 480 70 T 600 20 T 700 10"
                        fill="none"
                        stroke="#FF6A00"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 font-bold tech-mono uppercase">
                    <span>Mon_Session</span>
                    <span>Tue_Session</span>
                    <span>Wed_Session</span>
                    <span>Thu_Session</span>
                    <span>Fri_Session</span>
                    <span>Sat_Session</span>
                    <span>Sun_Session</span>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 5: TACTICAL METRICS COMPARE GRID
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-5 text-left">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border mb-4 text-[9px] font-bold tracking-widest uppercase tech-mono ${
              isDark ? "border-[#FF6A00]/30 bg-[#FF6A00]/5 text-[#FF6A00]" : "border-orange-500/20 bg-orange-500/5 text-[#FF6A00]"
            }`}>
              SYSTEM BENCHMARKS
            </div>
            <h2 className="jakarta font-black text-3xl sm:text-[36px] leading-tight tracking-tight uppercase mb-6">
              WhatsAgent.os vs <br />
              Manual Reps
            </h2>
            <p className={`body-font text-xs leading-relaxed mb-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Analyze processing speeds, deflect costs, and response timelines between autonomous pipeline cores and localized human sales rep workhours.
            </p>
            <div className="flex items-center gap-2 tech-mono text-[10px] font-bold text-slate-500 uppercase">
              <Zap size={14} className="text-[#FF6A00]" />
              <span>Telemetry data synchronized today</span>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Speed card */}
            <div className="glow-card rounded-2xl p-5 border text-left">
              <span className="text-[8px] font-extrabold text-slate-500 tracking-widest tech-mono uppercase block mb-3">
                METRIC: RESPONSE_LATENCY
              </span>
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-300">WhatsAgent.os</span>
                  <span className="text-lg font-black text-[#FF6A00] tech-mono">4.2 Seconds</span>
                </div>
                <div className="h-2 bg-slate-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#FF6A00] to-[#F97316] rounded-full w-full" />
                </div>
                <div className="flex justify-between items-baseline opacity-60">
                  <span className="text-xs font-semibold">Manual Reps</span>
                  <span className="text-xs font-bold tech-mono">4.8 Hours</span>
                </div>
                <div className="h-2 bg-slate-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-500/30 rounded-full w-12" />
                </div>
              </div>
            </div>

            {/* Cost card */}
            <div className="glow-card rounded-2xl p-5 border text-left">
              <span className="text-[8px] font-extrabold text-slate-500 tracking-widest tech-mono uppercase block mb-3">
                METRIC: COMPUTE_COST
              </span>
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-300">WhatsAgent.os</span>
                  <span className="text-lg font-black text-[#FF6A00] tech-mono">₹0.15 / loop</span>
                </div>
                <div className="h-2 bg-slate-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#FF6A00] to-[#F97316] rounded-full w-full" />
                </div>
                <div className="flex justify-between items-baseline opacity-60">
                  <span className="text-xs font-semibold">Manual Reps</span>
                  <span className="text-xs font-bold tech-mono">₹180.00 / hour</span>
                </div>
                <div className="h-2 bg-slate-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-500/30 rounded-full w-8" />
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 6: ENTERPRISE AUDIT CONTROL SYSTEM
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 border-y" style={{ borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto mb-16">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border mb-4 text-[9px] font-bold tracking-widest uppercase tech-mono ${
              isDark ? "border-purple-500/30 bg-purple-500/10 text-purple-400" : "border-purple-500/20 bg-purple-500/5 text-purple-600"
            }`}>
              SYSTEM SECURITY
            </div>
            <h2 className="jakarta font-black text-3xl sm:text-4xl tracking-tight mb-4 uppercase">
              Cryptographic Safeguards
            </h2>
            <p className={`body-font text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              WhatsAgent.os executes data queries within isolated sandboxes utilizing immutable credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Hardware Access Control", desc: "Define pipeline nodes boundaries for operator roles (Admins, Builders, Viewers) restricting edit schemas.", icon: UserCheck },
              { title: "Immutable Audit Trails", desc: "Every deployment pipeline trigger, API token configuration update, and export request is permanently logged.", icon: Lock },
              { title: "ISO-27001 Datacenters", desc: "All system credentials, webhook endpoints, and sync structures are fully encrypted utilizing AES-256 standards.", icon: Shield },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="glow-card rounded-2xl p-6 border text-left relative overflow-hidden scanlines">
                  <div className="absolute top-0 right-0 left-0 bg-[#FF6A00] h-[1px] opacity-40" />
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#FF6A00]/10 text-[#FF6A00] mb-5">
                    <Icon size={16} />
                  </div>
                  <h3 className="jakarta font-black text-sm uppercase tracking-wide mb-2">{item.title}</h3>
                  <p className={`body-font text-xs leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 7: CASE BLUEPRINT LOG FILTERS (TESTIMONIALS)
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-24 max-w-7xl mx-auto px-6 text-center">
        <div className="max-w-3xl mx-auto mb-16">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border mb-4 text-[9px] font-bold tracking-widest uppercase tech-mono ${
            isDark ? "border-[#FF6A00]/30 bg-[#FF6A00]/5 text-[#FF6A00]" : "border-orange-500/20 bg-orange-500/5 text-[#FF6A00]"
          }`}>
            CASE STUDY DEPLOYMENTS
          </div>
          <h2 className="jakarta font-black text-3xl sm:text-4xl tracking-tight mb-4 uppercase">
            Operational Blueprints
          </h2>
          <p className={`body-font text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Review verified performance metrics logged directly during production system runs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { name: "Rohan S.", role: "VP Growth, QuickPay", text: "We configured the WhatsApp automation webhook directly inside inbound ads. 82% of leads were enriched and qualified autonomously in under 5 minutes.", metric: "+267% qualified deals" },
            { name: "Deepika S.", role: "Director Ops, Decora", text: "AI nodes manage 80% of our story mentions and direct comments. The pipeline parses client details and builds Hubspot cards instantly.", metric: "-72% support cost deflection" },
            { name: "Steve T.", role: "Co-Founder, GrowthStack", text: "Unifying WhatsApp, stripe webhooks, and Slack notifications on one operating system has fully streamlined our transaction follow-up loops.", metric: "4.2s Qualify Latency" },
          ].map((t, idx) => (
            <div key={idx} className="glow-card rounded-2xl p-6 border text-left flex flex-col justify-between scanlines">
              <div>
                <div className="flex gap-0.5 text-amber-500 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={11} fill="currentColor" />
                  ))}
                </div>
                <p className={`body-font text-xs leading-relaxed italic mb-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  "{t.text}"
                </p>
              </div>

              <div className="border-t border-slate-500/10 pt-4 mt-6">
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="h-9 w-9 rounded-lg bg-[#FF6A00] flex items-center justify-center font-bold text-white text-xs tech-mono">
                    {t.name[0]}
                  </div>
                  <div>
                    <h4 className="jakarta font-bold text-xs">{t.name}</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">{t.role}</p>
                  </div>
                </div>

                <div className="px-3 py-2 bg-[#FF6A00]/5 border border-[#FF6A00]/10 rounded-lg flex items-center justify-between text-[8px] font-extrabold tech-mono">
                  <span className="text-slate-500 uppercase">VERIFIED_OUTCOME</span>
                  <span className="text-[#FF6A00] uppercase">{t.metric}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 8: RESOURCE ALLOCATION PLANNER (BILLING SLIDER)
      ══════════════════════════════════════════════════════════════ */}
      <section id="planner" className="py-20 border-y" style={{ borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto mb-16">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border mb-4 text-[9px] font-bold tracking-widest uppercase tech-mono ${
              isDark ? "border-[#FF6A00]/30 bg-[#FF6A00]/5 text-[#FF6A00]" : "border-orange-500/20 bg-orange-500/5 text-[#FF6A00]"
            }`}>
              COMPUTE PLANNER
            </div>
            <h2 className="jakarta font-black text-3xl sm:text-4xl tracking-tight mb-4 uppercase">
              Resource Allocation Planner
            </h2>
            <p className={`body-font text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Slide to scale your dedicated cluster slots. Scale compute capacity, active integration slots, and limits instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left: Allocation slider Controls */}
            <div className="lg:col-span-7 glow-card rounded-2xl p-6 border text-left flex flex-col justify-between scanlines">
              <div>
                <div className="flex items-center justify-between border-b border-slate-500/10 pb-4 mb-6">
                  <span className="text-[10px] font-extrabold text-[#FF6A00] tech-mono uppercase">
                    CLUSTER_SLOTS_ALLOCATOR
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold tech-mono">
                    SLOTS: {computeClusters} / 20 MAX
                  </span>
                </div>

                <p className={`body-font text-xs leading-relaxed mb-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Increase slots to spin up dedicated virtual CPU containers. Each slot increases concurrent transaction throughput limits and API route limits.
                </p>

                {/* React Native Slider Mock */}
                <div className="space-y-4 mb-8">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={computeClusters}
                    onChange={(e) => setComputeClusters(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-500/10 rounded-lg appearance-none cursor-pointer accent-[#FF6A00]"
                  />
                  <div className="flex justify-between text-[9px] font-bold tech-mono text-slate-500">
                    <span>1 SLOT (DEVELOPER)</span>
                    <span>10 SLOTS (GROWTH)</span>
                    <span>20 SLOTS (ENTERPRISE)</span>
                  </div>
                </div>
              </div>

              {/* Dynamic specs output details */}
              <div className="grid grid-cols-3 gap-4 border-t border-slate-500/10 pt-6">
                <div>
                  <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest tech-mono block">
                    VIRTUAL_VCPU_LIMIT
                  </span>
                  <span className="text-lg font-black text-white mt-1 block tech-mono">
                    {computeClusters * 2} Cores
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest tech-mono block">
                    ACTIVE_ROUTING_LINES
                  </span>
                  <span className="text-lg font-black text-white mt-1 block tech-mono">
                    {billingCalculations.activePipelineLimit} Routes
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest tech-mono block">
                    MONTHLY_THROUGHPUT
                  </span>
                  <span className="text-lg font-black text-[#FF6A00] mt-1 block tech-mono">
                    {billingCalculations.capacityTransactions.toLocaleString("en-IN")} msg/m
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Calculated Billing Card */}
            <div className="lg:col-span-5 glow-card rounded-2xl p-6 border text-left flex flex-col justify-between border-2 border-orange-500 relative">
              <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-[#FF6A00] to-[#F97316] h-1" />
              
              <div>
                <span className="text-[9px] font-extrabold text-[#FF6A00] tech-mono uppercase tracking-widest block mb-1">
                  CALCULATED_PLAN_TIER
                </span>
                <h3 className="jakarta font-black text-xl uppercase mb-4">
                  {billingCalculations.deflectionRating}
                </h3>
                
                <div className="flex items-baseline gap-1.5 border-b border-slate-500/10 pb-5 mb-5">
                  <span className="jakarta font-black text-4xl text-[#FF6A00]">
                    ₹{billingCalculations.totalCost.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-slate-500 font-bold tech-mono">/ month</span>
                </div>

                <div className="flex flex-col gap-3.5 text-xs text-slate-300 font-semibold">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={13} className="text-[#FF6A00]" />
                    <span>Dedicated pipeline hosting instances</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={13} className="text-[#FF6A00]" />
                    <span>Real-time lead enrichment APIs</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={13} className="text-[#FF6A00]" />
                    <span>Official Meta cloud route gateways</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={13} className="text-[#FF6A00]" />
                    <span>Immutable security logs & trails</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => goAuth("/register")}
                className="w-full py-3.5 bg-gradient-to-r from-[#FF6A00] to-[#F97316] text-white text-xs font-bold rounded-xl hover:brightness-105 transition-all text-center uppercase tracking-widest tech-mono mt-8"
              >
                PROVISION_CLUSTER_SLOTS
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 9: TROUBLESHOOTING DATABASE FAQs
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-24 max-w-4xl mx-auto px-6 text-center">
        <div className="mb-16">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border mb-4 text-[9px] font-bold tracking-widest uppercase tech-mono ${
            isDark ? "border-[#FF6A00]/30 bg-[#FF6A00]/5 text-[#FF6A00]" : "border-orange-500/20 bg-orange-500/5 text-[#FF6A00]"
          }`}>
            TROUBLESHOOTING TICKETS
          </div>
          <h2 className="jakarta font-black text-3xl sm:text-4xl tracking-tight mb-4 uppercase">
            Resolved System Queries
          </h2>
          <p className={`body-font text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Frequently resolved tickets relating to API setups, model weights, and compute allocations.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {FAQ_DATABASE.map((faq, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={idx} className="glow-card rounded-2xl overflow-hidden border transition-all duration-200">
                <button
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between font-bold text-xs uppercase tracking-wider tech-mono text-slate-200"
                >
                  <span>{faq.q}</span>
                  <span className="text-[#FF6A00]">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className={`border-t ${isDark ? "border-white/5 bg-[#030508]/40" : "border-slate-100 bg-slate-50"}`}
                    >
                      <p className={`p-5 text-xs sm:text-sm leading-relaxed text-left ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 10: ULTIMATE PLATFORM CALL TO ACTION
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-20 max-w-7xl mx-auto px-6 text-center">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF6A00]/15 via-[#8B5CF6]/5 to-transparent border border-[#FF6A00]/30 p-8 sm:p-12 md:p-20 shadow-2xl scanlines">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,106,0,0.06)_0%,transparent_60%)] pointer-events-none" />

          {/* Tri-color stripe HUD marker */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-white to-green-500 opacity-60" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border mb-6 text-[9px] font-bold tracking-widest uppercase tech-mono ${
              isDark ? "border-[#FF6A00]/30 bg-[#FF6A00]/5 text-[#FF6A00]" : "border-orange-500/20 bg-orange-500/5 text-[#FF6A00]"
            }`}>
              <Sparkles size={10} /> INITIALIZE CLUSTER GRID
            </div>

            <h2 className="jakarta font-black text-3xl sm:text-4xl md:text-5xl leading-tight mb-6 uppercase">
              Begin Automated Operations
            </h2>

            <p className={`body-font text-xs sm:text-sm mb-10 max-w-xl mx-auto leading-relaxed ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}>
              Spin up your dedicated pipeline instances, link Meta webhook gateways, and deploy autonomous cognitive models. Zero credit card required for developer trials.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => goAuth("/register")}
                className="px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#FF6A00] to-[#F97316] hover:brightness-105 shadow-xl shadow-orange-500/15 tech-mono flex items-center gap-2"
              >
                Launch Developer Trial <Rocket size={16} />
              </button>
              <button
                onClick={() => navigate("/contact")}
                className={`px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-wider border tech-mono flex items-center gap-2 transition-all ${
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                Operator Consultation
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-8 text-[9px] font-extrabold uppercase tracking-wider tech-mono opacity-60">
              <span>✅ 14-day free developer slot</span>
              <span>•</span>
              <span>🚀 Deploy cluster under 10 minutes</span>
              <span>•</span>
              <span>🔒 AES-256 secure encryption</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          HUD FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <footer className={`border-t transition-colors duration-300 ${
        isDark ? "border-white/5 bg-[#05070B]" : "border-slate-200 bg-slate-100"
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-12 gap-10">
          
          <div className="md:col-span-4 flex flex-col items-start text-left">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="h-9 w-9 bg-[#FF6A00] rounded-lg flex items-center justify-center text-white">
                <Cpu size={16} />
              </div>
              <span className="jakarta font-black text-xl bg-gradient-to-r from-[#FF6A00] to-[#F97316] bg-clip-text text-transparent">
                {brand}.os
              </span>
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed mb-4 max-w-[280px]">
              {branding?.branding_footer_text ||
                "WhatsAgent.os is a premium, developer-centric AI automation operating system to orchestrate workflows."}
            </p>
            <div className="flex items-center gap-2 text-[9px] font-bold text-[#FF6A00] tech-mono uppercase">
              <MapPin size={12} /> Built in India 🇮🇳 · Serving global networks 🌍
            </div>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8 text-left">
            <div>
              <h4 className="font-extrabold text-[10px] uppercase tracking-widest mb-4 text-slate-500 tech-mono">Platform</h4>
              <ul className="flex flex-col gap-2.5 text-xs font-semibold text-slate-400">
                <li><Link to="/app/agents" className="hover:text-[#FF6A00] transition-colors">Cognitive Nodes</Link></li>
                <li><Link to="/app/whatsapp" className="hover:text-[#FF6A00] transition-colors">WhatsApp API</Link></li>
                <li><Link to="/app/automation" className="hover:text-[#FF6A00] transition-colors">IG Hook Nodes</Link></li>
                <li><Link to="/app/leads" className="hover:text-[#FF6A00] transition-colors">Pipeline Logs</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-[10px] uppercase tracking-widest mb-4 text-slate-500 tech-mono">Company</h4>
              <ul className="flex flex-col gap-2.5 text-xs font-semibold text-slate-400">
                <li><Link to="/about-us" className="hover:text-[#FF6A00] transition-colors">About Operators</Link></li>
                <li><Link to="/blog" className="hover:text-[#FF6A00] transition-colors">System Logs</Link></li>
                <li><Link to="/careers" className="hover:text-[#FF6A00] transition-colors">Career Nodes</Link></li>
                <li><Link to="/contact" className="hover:text-[#FF6A00] transition-colors">Operator Help</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-[10px] uppercase tracking-widest mb-4 text-slate-500 tech-mono">Legal</h4>
              <ul className="flex flex-col gap-2.5 text-xs font-semibold text-slate-400">
                <li><Link to="/privacy-policy" className="hover:text-[#FF6A00] transition-colors">Privacy Shield</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-[#FF6A00] transition-colors">License Agreements</Link></li>
                <li><Link to="/security" className="hover:text-[#FF6A00] transition-colors">Security Safeguards</Link></li>
                <li><Link to="/data-deletion-policy" className="hover:text-[#FF6A00] transition-colors">Data Deletion Policy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-[10px] uppercase tracking-widest mb-4 text-slate-500 tech-mono">SYS_SETUP</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                Scale your dedicated compute slot limits in under 10 minutes.
              </p>
              <button
                onClick={() => goAuth("/register")}
                className="w-full py-2.5 bg-gradient-to-r from-[#FF6A00] to-[#F97316] text-white rounded-lg text-xs font-bold hover:brightness-105 transition-all flex items-center justify-center gap-1 uppercase tracking-wider tech-mono"
              >
                PROVISION_SLOT <ArrowRight size={12} />
              </button>
            </div>
          </div>

        </div>

        {/* Subfooter */}
        <div className={`border-t py-6 text-xs text-slate-500 ${
          isDark ? "border-white/5 bg-[#030407]" : "border-slate-200 bg-slate-100"
        }`}>
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p>© {new Date().getFullYear()} {brand}.os. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-[#FF6A00]" />
              <span className="font-bold tech-mono">WhatsAgent Cognitive Node OS v4.8</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

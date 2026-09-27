import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { MessageSquare, Instagram, Smartphone, Send, Globe, ArrowRight, Zap, Code, Shield, Target } from "lucide-react";
import { Link } from "react-router-dom";

export default function Integrations() {
  const integrationList = [
    {
      name: "WhatsApp Cloud API",
      desc: "Connect your official WhatsApp Business account to automate 24/7 customer service, broadcast campaigns, and dynamic flows.",
      icon: MessageSquare,
      color: "#25D366",
      status: "Native Official",
      features: ["Instant Auto-replies", "Bulk Broadcast Engine", "Live Contact Management"],
      link: "/app/automation"
    },
    {
      name: "Instagram Professional",
      desc: "Manage Story mentions, DMs, and post comments automatically. Convert followers into loyal customers with instant AI engagement.",
      icon: Instagram,
      color: "#E1306C",
      status: "Meta Partner API",
      features: ["DM AI Agent Automation", "Smart Comment-to-DM", "Lead Capture & Funneling"],
      link: "/app/automation/instagram"
    },
    {
      name: "YouTube Channel Ops",
      desc: "Automate video comment monitoring, community post replies, and audience conversion directly from your unified hub.",
      icon: Smartphone,
      color: "#FF0000",
      status: "Official Google API",
      features: ["Auto-moderation & Replies", "Shorts Engagement Tracking", "Lead Qualifier"],
      link: "/app/automation/youtube"
    },
    {
      name: "Telegram Bots",
      desc: "Build powerful autonomous channel dispatchers and interactive customer bots with Webhook & Bot API support.",
      icon: Send,
      color: "#229ED9",
      status: "Native Bot API",
      features: ["Custom Bot Logic", "Broadcast Pipelines", "Multi-tenant Sync"],
      link: "/app/automation"
    }
  ];

  const comingSoon = [
    { name: "Shopify Store Sync", icon: Zap, desc: "Order tracking & abandoned cart recovery on WhatsApp" },
    { name: "HubSpot CRM", icon: Target, desc: "Two-way contact and deal synchronization" },
    { name: "Salesforce Cloud", icon: Globe, desc: "Enterprise account & lead orchestration" },
    { name: "Slack Internal Dispatch", icon: MessageSquare, desc: "Real-time human agent alerts & escalations" },
  ];

  return (
    <StaticPageLayout
      title="Infinite Integrations"
      subtitle="Connect Graxion Flow with the channels and platforms you rely on every single day."
      badge="Omnichannel Ecosystem"
    >
      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-20">
        {integrationList.map((platform, i) => (
          <div
            key={i}
            className="p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: `${platform.color}15`, color: platform.color }}
                >
                  <platform.icon size={28} />
                </div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                  {platform.status}
                </span>
              </div>

              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white font-display">
                {platform.name}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                {platform.desc}
              </p>

              <div className="space-y-2 mb-8">
                {platform.features.map((feat, j) => (
                  <div key={j} className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: platform.color }}
                    />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/register"
              className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-900 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all"
            >
              Connect Channel <ArrowRight size={16} />
            </Link>
          </div>
        ))}
      </div>

      {/* Developer API Section */}
      <section className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs mb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-100 dark:border-blue-900/50">
              <Code className="w-3.5 h-3.5" /> Webhooks & REST API
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display mb-4">
              Custom Enterprise Connectors
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
              Need custom CRM synchronization, internal ERP triggers, or proprietary database access? Use our real-time webhook engine and OpenAPI-compliant endpoints to wire Graxion Flow directly into your existing infrastructure.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all"
              >
                Request API Access
              </Link>
              <Link
                to="/roadmap"
                className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all"
              >
                View Roadmap
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950 p-6 text-slate-200 font-mono text-xs overflow-x-auto shadow-inner border border-slate-800">
            <div className="flex items-center gap-1.5 mb-4 border-b border-slate-800 pb-3 text-slate-400 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2">webhook_dispatch.json</span>
            </div>
            <pre className="text-slate-300 leading-relaxed">
{`POST /api/v1/webhook/incoming
{
  "channel": "whatsapp",
  "sender_id": "+919876543210",
  "intent": "sales_lead_high_priority",
  "ai_agent_action": "handoff_ready",
  "status": "synchronized"
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Coming Soon Ecosystem */}
      <section className="mb-12">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center font-display">
          Expanding Ecosystem
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {comingSoon.map((item, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-xs text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                <item.icon size={20} />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                {item.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </StaticPageLayout>
  );
}

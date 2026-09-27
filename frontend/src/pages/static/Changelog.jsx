import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Zap, Bug, Sparkles, Rocket, CheckCircle2 } from "lucide-react";

export default function Changelog() {
  const updates = [
    {
      version: "v2.1.0",
      date: "May 2025",
      type: "Major Release",
      title: "Omnichannel Social Hub & Visual Flow Builder",
      desc: "Unified WhatsApp Cloud API, Instagram Professional DM, and YouTube Community comment monitoring into an instant-synchronization cockpit.",
      items: [
        { label: "New", text: "Drag-and-drop conversational node trigger workflow builder", icon: Sparkles, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50" },
        { label: "Improved", text: "Sub-500ms AI agent response latency with streaming inference", icon: Zap, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50" },
        { label: "Fixed", text: "Resolved token refresh edge case during high-volume WhatsApp broadcasts", icon: Bug, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50" },
      ],
    },
    {
      version: "v2.0.4",
      date: "April 2025",
      type: "Enhancement",
      title: "Automated Lead Scoring & CRM Two-Way Sync",
      desc: "AI now continuously evaluates conversation intent, scoring prospects dynamically and dispatching notifications to your sales teams.",
      items: [
        { label: "New", text: "Visual throughput velocity indicator in central dashboard", icon: Sparkles, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50" },
        { label: "Improved", text: "Multi-tenant role-based team management and granular permissions", icon: Zap, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50" },
      ],
    },
    {
      version: "v1.9.0",
      date: "March 2025",
      type: "Platform Release",
      title: "Enterprise Multi-Agent Intelligence Launch",
      desc: "Public rollout of autonomous agents trained on proprietary product knowledge bases with zero halluncination constraints.",
      items: [
        { label: "New", text: "Support for OpenAI GPT-4o, Claude 3.5 Sonnet, and Gemini 2.0 Flash", icon: Rocket, color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50" },
        { label: "New", text: "Official WhatsApp Cloud API QR linking and template approvals", icon: Sparkles, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50" },
      ],
    },
  ];

  return (
    <StaticPageLayout
      title="Product Changelog"
      subtitle="Stay up to date with the latest features, architectural upgrades, and bug fixes delivered weekly."
      badge="Continuous Deployment"
    >
      <div className="max-w-3xl mx-auto relative">
        <div className="space-y-12">
          {updates.map((update, i) => (
            <div
              key={i}
              className="p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-extrabold text-slate-900 dark:text-white font-display">
                    {update.version}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50">
                    {update.type}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {update.date}
                </span>
              </div>

              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white font-display">
                {update.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                {update.desc}
              </p>

              <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                {update.items.map((item, j) => (
                  <div key={j} className="flex items-start gap-3 text-xs sm:text-sm">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase shrink-0 mt-0.5 ${item.color}`}
                    >
                      <item.icon size={11} /> {item.label}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 leading-snug">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </StaticPageLayout>
  );
}

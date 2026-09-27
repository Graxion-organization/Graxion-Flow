import React, { useState } from "react";
import StaticPageLayout from "./StaticPageLayout";
import {
  CheckCircle2,
  Clock,
  Rocket,
  Zap,
  Globe,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../../components/seo/SEO";

export default function Roadmap() {
  const [activeFilter, setActiveFilter] = useState("all");

  const phases = [
    {
      quarter: "Q1 2025",
      title: "Foundation & Omnichannel Unification",
      status: "Shipped",
      statusColor: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900/40",
      items: [
        {
          title: "Official WhatsApp Cloud API 24/7 Engine",
          desc: "Full automated inbound message processing and conversational routing with zero latency.",
          icon: Zap,
          done: true,
        },
        {
          title: "Instagram Professional DM & Story Automations",
          desc: "Live keyword trigger listeners for incoming direct messages and mention notifications.",
          icon: MessageSquare,
          done: true,
        },
        {
          title: "YouTube Studio Comment Orchestration",
          desc: "Auto-moderation and smart response pipeline for new video and Shorts comments.",
          icon: Globe,
          done: true,
        },
      ],
    },
    {
      quarter: "Q2 2025",
      title: "Autonomous Agents & Visual Flow Builder",
      status: "In Progress",
      statusColor: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/40",
      items: [
        {
          title: "Drag-and-Drop Node Trigger Canvas",
          desc: "Visual conditional logic builder for multi-step customer journeys across channels.",
          icon: Sparkles,
          done: true,
        },
        {
          title: "Autonomous Multi-Agent Collaboration",
          desc: "Specialized sub-agents for lead qualification, booking, support, and technical dispatch.",
          icon: Rocket,
          done: true,
        },
        {
          title: "Real-Time Velocity Analytics v2",
          desc: "Micro-second tracking of response throughput, resolution rates, and agent efficiency.",
          icon: Zap,
          done: false,
        },
      ],
    },
    {
      quarter: "Q3 2025",
      title: "E-Commerce Intelligence & Voice Agents",
      status: "Planned",
      statusColor: "text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-900/40",
      items: [
        {
          title: "Shopify & WooCommerce Real-Time Sync",
          desc: "Automated cart abandonment recovery, order lookups, and tracking notifications on WhatsApp.",
          icon: Globe,
          done: false,
        },
        {
          title: "Low-Latency Voice Agent Streaming",
          desc: "Conversational voice agents capable of handling live telephone and WhatsApp audio inquiries.",
          icon: Zap,
          done: false,
        },
        {
          title: "HubSpot & Salesforce Two-Way Sync",
          desc: "Direct contact, deal stage, and activity synchronization into primary enterprise CRMs.",
          icon: Rocket,
          done: false,
        },
      ],
    },
    {
      quarter: "Q4 2025",
      title: "Global Enterprise SDK & White-labeling",
      status: "Future",
      statusColor: "text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700",
      items: [
        {
          title: "Omnichannel Headless Developer SDK",
          desc: "Type-safe Node.js and Python SDKs to embed Graxion Flow agents into custom apps.",
          icon: Globe,
          done: false,
        },
        {
          title: "Enterprise Multi-Tenant White-Labeling",
          desc: "Custom domains, branded portals, and dedicated billing tiers for agencies.",
          icon: Rocket,
          done: false,
        },
        {
          title: "Autonomous Video Response Synthesis",
          desc: "Generative AI personalized video replies for high-ticket customer interactions.",
          icon: Sparkles,
          done: false,
        },
      ],
    },
  ];

  const filteredPhases =
    activeFilter === "all"
      ? phases
      : phases.filter((p) => p.status.toLowerCase().replace(/\s+/g, "") === activeFilter);

  return (
    <StaticPageLayout
      title="Product Roadmap & Vision"
      subtitle="Transparently architecting the future of social operations. See what we have shipped and what is launching next."
      badge="Public Roadmap"
    >
      <SEO
        title="Product Roadmap | Graxion Flow"
        description="Explore the Graxion Flow public roadmap. View upcoming integrations, AI agent developments, and enterprise automation features."
        canonicalUrl="https://flow.graxion.in/roadmap"
      />

      {/* Filter Tabs */}
      <div className="flex items-center justify-center gap-2 mb-14 flex-wrap">
        {[
          { id: "all", label: "All Milestones" },
          { id: "shipped", label: "Shipped" },
          { id: "inprogress", label: "In Progress" },
          { id: "planned", label: "Planned" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeFilter === tab.id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline Phases */}
      <div className="space-y-12 max-w-4xl mx-auto mb-20">
        {filteredPhases.map((phase, idx) => (
          <div
            key={idx}
            className="p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1">
                  {phase.quarter}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-display">
                  {phase.title}
                </h2>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full border ${phase.statusColor}`}
              >
                {phase.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {phase.items.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <item.icon size={18} />
                      </div>
                      {item.done ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={14} /> Shipped
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                          <Clock size={14} /> In Flight
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Feature Request CTA */}
      <div className="p-8 sm:p-12 rounded-3xl bg-blue-50/50 dark:bg-slate-900/80 border border-blue-100 dark:border-blue-900/40 text-center shadow-xs max-w-2xl mx-auto">
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-display mb-3">
          Have a Feature or Integration Request?
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-lg mx-auto mb-6">
          We prioritize our engineering sprints based on direct enterprise feedback. Let our product team know what workflows you need.
        </p>
        <Link
          to="/contact"
          className="px-6 py-3 rounded-full font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all inline-flex items-center gap-2"
        >
          Submit Request <ArrowRight size={16} />
        </Link>
      </div>
    </StaticPageLayout>
  );
}

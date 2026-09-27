import React from "react";
import StaticPageLayout from "../static/StaticPageLayout";
import { ShieldCheck, Cpu, AlertTriangle, Eye, Lock, FileText, CheckCircle2 } from "lucide-react";
import SEO from "../../components/seo/SEO";

export default function AIPolicy() {
  const principles = [
    {
      title: "1. Ethical AI Principles & Transparency",
      content:
        "Graxion Flow is dedicated to deploying ethical, safe, and transparent AI autonomous agents. Our systems are engineered to empower human creators and businesses with automated assistance, not deception. AI-generated responses adhere to strict factual guardrails and context boundaries.",
      icon: Cpu,
    },
    {
      title: "2. Prohibited Uses & Malicious Automation",
      content:
        "Users and enterprise clients may not utilize Graxion Flow AI models or workflows to generate deceptive phishing schemes, distribute unsolicited bulk spam, generate hateful or defamatory content, impersonate human identities with fraudulent intent, or bypass platform integrity measures.",
      icon: AlertTriangle,
    },
    {
      title: "3. Model Training & Data Privacy",
      content:
        "Customer proprietary conversation logs and message data are never used to train public foundation models without explicit consent. Your customer communications remain strictly within your tenant boundary and are handled under enterprise zero-retention API policies.",
      icon: Lock,
    },
    {
      title: "4. Human-in-the-Loop Safeguards",
      content:
        "Our system provides built-in confidence thresholds and human escalation protocols. When an AI agent encounters sensitive topics, high-value transactions, or customer distress, conversations are automatically flagged and routed to your human team members.",
      icon: Eye,
    },
    {
      title: "5. Continuous Monitoring & Abuse Enforcement",
      content:
        "We actively inspect system-level throughput and anomaly metrics to prevent policy abuse. Any account found using automated AI agents in breach of platform terms or international AI safety regulations will face immediate suspension.",
      icon: ShieldCheck,
    },
  ];

  return (
    <StaticPageLayout
      title="AI Ethics & Usage Policy"
      subtitle="Our commitment to responsible AI automation, algorithmic safety, and data sovereignty."
      badge="Responsible AI"
    >
      <SEO
        title="AI Ethics & Usage Policy | Graxion Flow"
        description="Our commitment to responsible AI automation, transparency, and data safety across WhatsApp, Instagram, and YouTube operations."
        canonicalUrl="https://flow.graxion.in/ai-policy"
      />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Core Notice */}
        <div className="p-7 sm:p-9 rounded-3xl bg-blue-50/50 dark:bg-slate-900/80 border border-blue-100 dark:border-blue-900/40 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-bold text-sm uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" /> AI Safety Framework
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
            Graxion Flow incorporates state-of-the-art inference engines from verified providers (including OpenAI, Anthropic, and Google). All agent prompts, tools, and actions are validated against prompt-injection defenses and real-time safety classifiers.
          </p>
        </div>

        {principles.map((p, i) => (
          <div
            key={i}
            className="p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center">
                <p.icon size={18} />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display">
                {p.title}
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
              {p.content}
            </p>
          </div>
        ))}
      </div>
    </StaticPageLayout>
  );
}

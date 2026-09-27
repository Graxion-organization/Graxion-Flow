import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import {
  Shield,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lock,
  Mail,
  RefreshCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../../components/seo/SEO";

export default function DataDeletion() {
  const steps = [
    {
      step: "01",
      title: "Initiate Deletion Request",
      desc: "Navigate to Account Settings > Privacy & Data Controls. Authenticate with your enterprise administrator credentials and click 'Request Account & Data Deletion'.",
      icon: Trash2,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/50 border-rose-100 dark:border-rose-900/40",
    },
    {
      step: "02",
      title: "Multi-Step Ownership Verification",
      desc: "To protect your business from malicious takeovers, Graxion Flow dispatches a cryptographically signed verification challenge to your registered primary email.",
      icon: Lock,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900/40",
    },
    {
      step: "03",
      title: "Immediate Operational Quarantine",
      desc: "Once confirmed, all active webhooks, scheduled dispatches, AI agents, and third-party channel integrations (WhatsApp, Instagram, YouTube) are immediately halted.",
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-900/40",
    },
    {
      step: "04",
      title: "30-Day Recovery Grace Period",
      desc: "Your data is placed into an encrypted, isolated archive for 30 days. You can cancel your request and restore your workflows anytime during this window.",
      icon: Clock,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/50 border-purple-100 dark:border-purple-900/40",
    },
    {
      step: "05",
      title: "Permanent & Irreversible Purge",
      desc: "Upon expiration of the 30-day window, all customer records, conversation threads, authorization tokens, media assets, and analytics are permanently wiped from all servers and backups.",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/40",
    },
  ];

  return (
    <StaticPageLayout
      title="User Data Deletion Policy"
      subtitle="Complete transparency and full control over your enterprise data, token revocation, and account removal."
      badge="GDPR & Platform Compliance"
    >
      <SEO
        title="User Data Deletion Policy | Graxion Flow"
        description="Learn how to initiate data deletion, revoke social platform tokens, and request permanent erasure under GDPR, Meta, and Google platform requirements."
        canonicalUrl="https://flow.graxion.in/data-deletion-policy"
      />

      <div className="max-w-3xl mx-auto space-y-12">
        {/* Meta / Platform Regulatory Notice */}
        <div className="p-7 sm:p-9 rounded-3xl bg-blue-50/50 dark:bg-slate-900/80 border border-blue-100 dark:border-blue-900/40 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-bold text-sm uppercase tracking-wider">
            <Shield className="w-4 h-4" /> Compliance Notice (Meta, WhatsApp, Google)
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
            In compliance with Meta Platform Terms, WhatsApp Business Policy, and Google API Services User Data Policy, Graxion Flow provides full autonomy to delete your data and revoke OAuth tokens at any time. When you remove Graxion Flow from your Meta or Google Account settings, our automated Data Deletion Callback will process your request within 24 hours.
          </p>
        </div>

        {/* 5-Step Process */}
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-display mb-6">
            The Data Deletion Lifecycle
          </h2>

          <div className="space-y-4">
            {steps.map((item, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-5 items-start sm:items-center"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${item.bg} ${item.color}`}
                >
                  <item.icon size={22} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                      {item.step}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Card */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-display mb-3">
            Need to Manage Your Privacy Settings?
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-lg mx-auto mb-6">
            You can configure data retention durations, disconnect social channels, or request a complete data export from your workspace dashboard.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/app/settings"
              className="px-6 py-3 rounded-full font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all inline-flex items-center gap-2"
            >
              Account Settings <ArrowRight size={16} />
            </Link>
            <a
              href="mailto:privacy@graxion.in"
              className="px-6 py-3 rounded-full font-bold text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all inline-flex items-center gap-2"
            >
              <Mail size={16} /> Contact DPO
            </a>
          </div>
        </div>
      </div>
    </StaticPageLayout>
  );
}

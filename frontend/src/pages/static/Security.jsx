import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import {
  ShieldCheck,
  Lock,
  Server,
  UserCheck,
  Key,
  FileCheck,
  RefreshCw,
  AlertCircle,
  Mail,
  CheckCircle2,
  Cpu,
} from "lucide-react";
import SEO from "../../components/seo/SEO";

export default function Security() {
  const securityPillars = [
    {
      title: "End-to-End Encryption",
      desc: "All traffic in transit is strictly encrypted using TLS 1.3 with forward secrecy. At rest, data and customer tokens are protected using AES-256 in hardware-isolated security modules.",
      icon: Lock,
      badge: "In Transit & Rest",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900/40",
    },
    {
      title: "SOC 2 Type II Audited",
      desc: "Our systems and organizational controls undergo continuous third-party compliance audits to ensure our security, availability, and confidentiality meet top enterprise benchmarks.",
      icon: ShieldCheck,
      badge: "Continuous Audit",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/40",
    },
    {
      title: "Isolated Token Vaults",
      desc: "Third-party platform API credentials (Meta, WhatsApp, Google YouTube, Telegram) are segregated with zero-knowledge access patterns and automated token rotation cycles.",
      icon: Key,
      badge: "Zero-Knowledge",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/50 border-purple-100 dark:border-purple-900/40",
    },
    {
      title: "Enterprise IAM & MFA",
      desc: "Enforce multi-factor authentication (MFA), Single Sign-On (SSO / SAML 2.0), and granular role-based access control (RBAC) to ensure principle of least privilege across your teams.",
      icon: UserCheck,
      badge: "SSO & RBAC",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-900/40",
    },
    {
      title: "Hardened Infrastructure",
      desc: "Hosted on resilient cloud clusters with multi-region failover, real-time DDoS mitigation, automated vulnerability scanning, and isolated container execution boundaries.",
      icon: Server,
      badge: "99.99% Uptime SLA",
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900/40",
    },
    {
      title: "Real-Time Threat Detection",
      desc: "Every API request and dispatch webhook is analyzed for anomaly detection, rate-limiting violations, unauthorized tampering, and injection payloads before execution.",
      icon: Cpu,
      badge: "Automated Defense",
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/50 border-rose-100 dark:border-rose-900/40",
    },
  ];

  const complianceBadges = [
    { name: "SOC 2 Type II", status: "Compliant" },
    { name: "ISO 27001", status: "Certified Architecture" },
    { name: "GDPR & CCPA", status: "Fully Compliant" },
    { name: "TLS 1.3 / AES-256", status: "Enforced" },
  ];

  return (
    <StaticPageLayout
      title="Security & Enterprise Trust"
      subtitle="Safeguarding your social operations with zero-trust architecture, hardware-secured token vaults, and enterprise compliance."
      badge="Security First"
    >
      <SEO
        title="Security & Enterprise Trust | Graxion Flow"
        description="Learn how Graxion Flow secures your social data, tokens, and customer conversations with AES-256, TLS 1.3, SOC 2 compliance, and zero-knowledge vaults."
        canonicalUrl="https://flow.graxion.in/security"
      />

      {/* Compliance Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {complianceBadges.map((badge, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs"
          >
            <div className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1.5">
              <CheckCircle2 size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">
                {badge.status}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-display">
              {badge.name}
            </h3>
          </div>
        ))}
      </div>

      {/* Security Pillars Bento Grid */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display mb-3">
            Built from the Ground Up for Enterprise Trust
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            We understand that customer conversations and platform tokens are your most critical assets. Here is how we ensure zero compromise.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {securityPillars.map((feature, i) => (
            <div
              key={i}
              className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${feature.bg} ${feature.color}`}
                  >
                    <feature.icon size={22} />
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {feature.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2.5 text-slate-900 dark:text-white font-display">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vulnerability Disclosure & Bug Bounty Card */}
      <div className="p-8 sm:p-12 rounded-3xl bg-blue-50/50 dark:bg-slate-900/80 border border-blue-100 dark:border-blue-900/40 text-center shadow-xs max-w-3xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/25">
          <ShieldCheck size={28} />
        </div>
        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white font-display mb-3">
          Responsible Vulnerability Disclosure
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-6 leading-relaxed">
          We welcome collaboration with independent security researchers. If you believe you have discovered a security vulnerability in Graxion Flow, please report it immediately to our security engineering team.
        </p>
        <div className="inline-flex flex-col sm:flex-row items-center gap-3">
          <a
            href="mailto:security@graxion.in"
            className="px-6 py-3 rounded-full font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all inline-flex items-center gap-2"
          >
            <Mail size={16} /> security@graxion.in
          </a>
        </div>
      </div>
    </StaticPageLayout>
  );
}

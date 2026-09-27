import React from "react";
import StaticPageLayout from "../static/StaticPageLayout";
import { ShieldAlert, Ban, CheckCircle2, Server, Terminal, Lock } from "lucide-react";
import SEO from "../../components/seo/SEO";

export default function AcceptableUse() {
  const sections = [
    {
      title: "1. Scope & Application",
      content:
        "This Acceptable Use Policy defines the standards for interacting with Graxion Flow APIs, user interfaces, autonomous agents, and webhook dispatchers. It applies to all account owners, invited team members, and integrated third-party clients.",
      icon: Terminal,
    },
    {
      title: "2. Prohibited Content & Behavior",
      content:
        "You may not use Graxion Flow to transmit, schedule, or broadcast content that is illegal, defamatory, promotes discrimination or violence, infringes upon third-party copyrights or trademarks, or distributes deceptive software, malware, or phishing campaigns.",
      icon: Ban,
    },
    {
      title: "3. WhatsApp & Social Network Rule Compliance",
      content:
        "Users must strictly abide by Meta's Platform Terms, the WhatsApp Business Messaging Policy, YouTube Community Guidelines, and Instagram Developer Policies. Harvesting unauthorized user phone numbers, circumventing Meta opt-in requirements, or sending spam broadcast blasts without explicit recipient opt-in will result in immediate API termination.",
      icon: ShieldAlert,
    },
    {
      title: "4. Infrastructure & System Integrity",
      content:
        "Attempting to probe, scan, or test the vulnerability of Graxion Flow systems, circumvent rate limiters, reverse engineer backend queuing microservices, or execute distributed denial-of-service (DDoS) attacks against our infrastructure is strictly prohibited and subject to legal prosecution.",
      icon: Server,
    },
    {
      title: "5. Enforcement & Violations",
      content:
        "Graxion Flow reserves the right to suspend or permanently terminate access to any workspace found in violation of this policy. Depending on the severity of the infraction, we may report abusive activities to competent regulatory authorities and upstream telecom carriers.",
      icon: Lock,
    },
  ];

  return (
    <StaticPageLayout
      title="Acceptable Use Policy"
      subtitle="Guidelines and standards governing the fair and safe operation of Graxion Flow services."
      badge="Platform Standards"
    >
      <SEO
        title="Acceptable Use Policy | Graxion Flow"
        description="Guidelines and standards governing the fair, legal, and compliant operation of Graxion Flow platform services and APIs."
        canonicalUrl="https://flow.graxion.in/acceptable-use"
      />

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="p-7 sm:p-9 rounded-3xl bg-blue-50/50 dark:bg-slate-900/80 border border-blue-100 dark:border-blue-900/40 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-bold text-sm uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" /> Zero Tolerance for Spam
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
            Graxion Flow is built to foster high-quality, authentic customer relationships. We operate zero tolerance for unsolicited spam, unsolicited cold outbound messaging, or policy circumvention.
          </p>
        </div>

        {sections.map((section, idx) => (
          <div
            key={idx}
            className="p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center">
                <section.icon size={18} />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-display">
                {section.title}
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
              {section.content}
            </p>
          </div>
        ))}
      </div>
    </StaticPageLayout>
  );
}

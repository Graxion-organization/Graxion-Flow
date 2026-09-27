import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Shield, Lock, Eye, FileText, CheckCircle2 } from "lucide-react";

export default function Privacy() {
  const sections = [
    {
      title: "1. Information We Collect",
      content:
        "We collect information that you provide directly to us when creating an account, connecting authorized social channels, configuring AI agents, or contacting our technical support team. This includes your name, verified business email, organization details, and metadata required for webhook automation.",
      icon: Eye,
    },
    {
      title: "2. How We Use Your Data",
      content:
        "Your data is used solely to provide, operate, and enhance our services. This includes parsing incoming messages, running custom fine-tuned workflows, delivering customer replies, and sending critical technical notices or security alerts.",
      icon: Lock,
    },
    {
      title: "3. Enterprise Security & Encryption",
      content:
        "We implement industry-standard AES-256 and TLS 1.3 encryption protocols for all data in transit and at rest. Access tokens are stored in hardware-secured key vaults with role-based segregation.",
      icon: Shield,
    },
    {
      title: "4. Third-Party Platform Policies",
      content:
        "We do not sell, rent, or monetize your personal or customer data. We communicate strictly with authorized third-party APIs (such as Meta for WhatsApp and Instagram, and Google for YouTube) strictly as necessary to execute your defined workflows.",
      icon: FileText,
    },
  ];

  return (
    <StaticPageLayout
      title="Privacy Policy"
      subtitle="Last updated: 2025. Your data privacy, security, and trust are our highest priorities."
      badge="Compliance & Transparency"
    >
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Meta & Google API Disclosure Box */}
        <div className="p-7 sm:p-9 rounded-3xl bg-blue-50/50 dark:bg-slate-900/80 border border-blue-100 dark:border-blue-900/40 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-bold text-sm uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" /> Platform Disclosures
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
            <strong>Meta (Facebook, Instagram, WhatsApp) Permissions:</strong> Graxion Flow accesses your authorized Meta accounts to provide social operations, automated replies, and synchronized publishing. By connecting these accounts, you permit us to read and respond to messages on your behalf according to your configured rules. We strictly abide by Meta's Platform Terms and Developer Policies. You may revoke access at any time through your Meta Account Settings.
          </p>
          <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
            <strong>Google & YouTube API Services:</strong> Graxion Flow uses official YouTube API Services. By connecting YouTube, you agree to the{" "}
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 font-semibold underline hover:no-underline"
            >
              YouTube Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="http://www.google.com/policies/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 font-semibold underline hover:no-underline"
            >
              Google Privacy Policy
            </a>
            . Our use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including Limited Use requirements.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <div
              key={i}
              className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex gap-5 items-start"
            >
              <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
                <section.icon size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 font-display">
                  {section.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
                  {section.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StaticPageLayout>
  );
}

import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { ShieldCheck, FileText, CheckCircle2 } from "lucide-react";

export default function Terms() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content:
        "By accessing, registering, or utilizing Graxion Flow, you agree to be legally bound by these Terms of Service, our Privacy Policy, and all applicable global laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this service.",
    },
    {
      title: "2. License & Service Scope",
      content:
        "Subject to compliance with these Terms, Graxion grants you a non-exclusive, non-transferable, revocable license to access the platform to automate social channels, schedule posts, manage customer interactions, and deploy AI autonomous agents.",
    },
    {
      title: "3. Meta Integrations (Facebook, Instagram, WhatsApp)",
      content:
        "When connecting Meta accounts, you explicitly agree to comply with Meta's Platform Terms and Developer Policies. You authorize Graxion Flow to publish, reply, and process messages in accordance with your configured automation settings. You remain solely responsible for the content you distribute through your connected channels.",
    },
    {
      title: "4. Google & YouTube Platform Terms",
      content:
        "Connecting your YouTube account requires acceptance of YouTube Terms of Service (https://www.youtube.com/t/terms) and Google's Privacy Policy. Graxion Flow accesses YouTube data strictly within the boundaries of user-configured scheduling, comment replies, and analytics retrieval.",
    },
    {
      title: "5. User Conduct & Account Security",
      content:
        "You must maintain the confidentiality of your credentials. You agree never to use the Service for abusive, deceptive, spamming, copyright-infringing, or malicious activities. Any breach results in immediate account termination.",
    },
    {
      title: "6. Limitation of Liability",
      content:
        "In no event shall Graxion, its officers, or its partners be liable for any indirect, incidental, or consequential damages resulting from platform downtime, third-party API outages, or unauthorized access.",
    },
  ];

  return (
    <StaticPageLayout
      title="Terms of Service"
      subtitle="Please read these legal terms carefully before deploying or operating Graxion Flow."
      badge="Legal Agreement"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {sections.map((section, i) => (
          <div
            key={i}
            className="p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white font-display">
              {section.title}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
              {section.content}
            </p>
          </div>
        ))}
      </div>
    </StaticPageLayout>
  );
}

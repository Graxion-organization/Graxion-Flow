import React from "react";
import StaticPageLayout from "../static/StaticPageLayout";
import { Cookie, Shield, Sliders, CheckCircle2, Info } from "lucide-react";
import SEO from "../../components/seo/SEO";

export default function CookiePolicy() {
  const cookieTypes = [
    {
      title: "1. Essential & Authentication Cookies",
      desc: "Strictly necessary for security, session verification, CSRF defense, and user authentication. Without these cookies, authenticated workspace areas cannot function.",
      icon: Shield,
      required: true,
    },
    {
      title: "2. Performance & Reliability Analytics",
      desc: "Anonymized telemetry to measure response latencies, server errors, and UI stability so our engineering team can optimize platform throughput.",
      icon: Sliders,
      required: false,
    },
    {
      title: "3. Preferences & Theme State",
      desc: "Stores your personal interface settings, such as your Light / Dark mode preference, collapsed sidebar state, and language selection.",
      icon: Cookie,
      required: false,
    },
  ];

  return (
    <StaticPageLayout
      title="Cookie Policy"
      subtitle="How Graxion Flow uses cookies and local storage to provide secure, personalized, and performant operations."
      badge="Privacy & Transparency"
    >
      <SEO
        title="Cookie Policy | Graxion Flow"
        description="Learn how Graxion Flow utilizes cookies and session storage to safeguard authentication, remember theme preferences, and optimize performance."
        canonicalUrl="https://flow.graxion.in/cookie-policy"
      />

      <div className="max-w-3xl mx-auto space-y-8">
        <div className="p-7 sm:p-9 rounded-3xl bg-blue-50/50 dark:bg-slate-900/80 border border-blue-100 dark:border-blue-900/40 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-bold text-sm uppercase tracking-wider">
            <Info className="w-4 h-4" /> What Are Cookies?
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
            Cookies are small cryptographic text tokens placed on your device by websites you visit. They enable platforms to remember your authenticated session across browser tabs and maintain interface preferences safely.
          </p>
        </div>

        <div className="space-y-5">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-display">
            Categories of Cookies We Use
          </h2>

          {cookieTypes.map((type, i) => (
            <div
              key={i}
              className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
            >
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
                  <type.icon size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display">
                      {type.title}
                    </h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    {type.desc}
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0 ${
                  type.required
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    : "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                }`}
              >
                {type.required ? "Always Active" : "Configurable"}
              </span>
            </div>
          ))}
        </div>

        <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display mb-2">
            Managing & Disabling Cookies
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
            You can configure your browser to block third-party cookies or notify you whenever a cookie is set. Please note that blocking strictly essential cookies will prevent logging in to the Graxion Flow operational cockpit.
          </p>
        </div>
      </div>
    </StaticPageLayout>
  );
}

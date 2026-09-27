import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Users, Globe, Target, Shield, Zap, Heart, Sparkles } from "lucide-react";

export default function About() {
  const stats = [
    { label: "Founded", value: "2024", icon: Globe },
    { label: "Active Brands", value: "10k+", icon: Users },
    { label: "Messages Processed", value: "100M+", icon: Zap },
    { label: "Uptime Reliability", value: "99.9%", icon: Shield },
  ];

  const values = [
    {
      title: "Innovation First",
      desc: "We push the boundaries of what's possible with AI to solve real-world customer communication challenges.",
      icon: Zap,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50",
    },
    {
      title: "Customer Centric",
      desc: "Every feature we build starts with real user pain points. Your growth is our primary metric of success.",
      icon: Heart,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50",
    },
    {
      title: "Trust & Enterprise Security",
      desc: "We treat your conversations with the utmost security. End-to-end encryption and compliance are our bedrock.",
      icon: Shield,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900/50",
    },
    {
      title: "Global Vision",
      desc: "Built to empower creators and enterprises worldwide with seamless omnichannel automation.",
      icon: Globe,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50",
    },
  ];

  return (
    <StaticPageLayout
      title="Our Mission is to Automate"
      subtitle="We're building the future of business communication through intelligent AI agents and seamless workflows."
      badge="About Graxion Flow"
    >
      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-20">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs"
          >
            <div className="mb-4 inline-flex p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
              <stat.icon size={22} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-1 font-display text-slate-900 dark:text-white">
              {stat.value}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Story Section */}
      <section className="mb-24">
        <div className="flex flex-col md:flex-row gap-10 lg:gap-14 items-center">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Our Journey
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold mb-5 font-display text-slate-900 dark:text-white tracking-tight">
              The Story Behind <span className="text-blue-600 dark:text-blue-400">Graxion Flow</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base sm:text-lg mb-4">
              Founded in 2024, Graxion Flow started with an uncompromising vision: eliminate the chaotic fragmentation of managing WhatsApp, Instagram, and YouTube.
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base sm:text-lg">
              We engineered a unified cockpit combining multi-agent autonomous AI, an omnichannel dispatch center, and a visual trigger builder. Today, teams use Graxion Flow to deliver instant, personalized customer experiences at enterprise scale.
            </p>
          </div>
          <div className="flex-1 relative w-full">
            <div className="w-full aspect-[4/3] rounded-3xl bg-gradient-to-tr from-blue-100 via-indigo-50 to-white dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-md">
              <div className="text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                  <Zap size={32} />
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Autonomous Operations</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Next-generation multi-platform orchestration</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="mb-12">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 font-display text-slate-900 dark:text-white">
            Core Values
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            The foundational principles guiding our product and culture.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {values.map((val, i) => (
            <div
              key={i}
              className="p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition-colors"
            >
              <div className={`mb-5 inline-flex p-3.5 rounded-2xl ${val.bg} ${val.color}`}>
                <val.icon size={24} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2.5 text-slate-900 dark:text-white">
                {val.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {val.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </StaticPageLayout>
  );
}

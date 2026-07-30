import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Users, Globe, Target, Shield, Zap, Heart } from "lucide-react";

export default function About() {
  const stats = [
    { label: "Founded", value: "2024", icon: Globe },
    { label: "Active Users", value: "10k+", icon: Users },
    { label: "Messages Sent", value: "100M+", icon: Zap },
    { label: "Reliability", value: "99.9%", icon: Shield },
  ];

  const values = [
    {
      title: "Innovation First",
      desc: "We push the boundaries of what's possible with AI to solve real-world communication challenges.",
      icon: Zap,
      color: "text-brand-400",
      bg: "bg-brand-500/10"
    },
    {
      title: "Customer Centric",
      desc: "Every feature we build starts with a customer problem. Your growth is our primary metric of success.",
      icon: Heart,
      color: "text-rose-400",
      bg: "bg-rose-500/10"
    },
    {
      title: "Trust & Security",
      desc: "We treat your data with the highest level of care. Security isn't a feature; it's our foundation.",
      icon: Shield,
      color: "text-purple-400",
      bg: "bg-purple-500/10"
    },
    {
      title: "Global Vision",
      desc: "Built in India for the world. We're democratizing high-end AI automation for businesses everywhere.",
      icon: Globe,
      color: "text-blue-400",
      bg: "bg-blue-500/10"
    }
  ];

  return (
    <StaticPageLayout 
      title="Our Mission is to Automate" 
      subtitle="We're building the future of business communication through intelligent AI agents."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24">
        {stats.map((stat, i) => (
          <div key={i} className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] text-center">
            <div className="mb-4 inline-flex p-3 rounded-2xl bg-brand-500/10 text-brand-500">
              <stat.icon size={24} />
            </div>
            <h2 className="text-3xl font-extrabold mb-1 font-display text-white">{stat.value}</h2>
            <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="mb-24">
        <div className="flex flex-col md:flex-row gap-12 lg:gap-16 items-center">
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-6 font-display text-white">
              The Story Behind <span className="text-brand-500">Our Platform</span>
            </h2>
            <p className="text-gray-400 leading-relaxed text-lg mb-6">
              Founded in 2024, we started with a simple vision: to revolutionize how businesses manage customer interactions. We quickly realized that traditional support pipelines were too slow, rigid, and disconnected from modern channels like WhatsApp and Instagram.
            </p>
            <p className="text-gray-400 leading-relaxed text-lg">
              That's why we built our flagship enterprise-grade product. It brings together Cognitive AI Agents, an Omnichannel Inbox, and a Visual Flow Builder. Today, we're a team of passionate engineers dedicated to making high-end AI automation accessible to modern businesses everywhere.
            </p>
          </div>
          <div className="flex-1 relative w-full">
             <div className="w-full aspect-[4/3] rounded-3xl bg-gradient-to-br from-brand-500/20 to-brand-500/5 flex items-center justify-center overflow-hidden border border-brand-500/30">
                <Zap size={100} className="text-brand-500 opacity-50" />
             </div>
          </div>
        </div>
      </section>

      <section className="mb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 font-display text-white">Core Values</h2>
          <p className="text-gray-400 text-lg">The principles that guide everything we do.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {values.map((val, i) => (
            <div key={i} className="p-10 rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
              <div className={`mb-6 inline-flex p-4 rounded-2xl ${val.bg} ${val.color}`}>
                <val.icon size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{val.title}</h3>
              <p className="text-gray-400 leading-relaxed">{val.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </StaticPageLayout>
  );
}

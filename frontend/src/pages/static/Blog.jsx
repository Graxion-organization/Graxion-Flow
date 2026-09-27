import React, { useState } from "react";
import StaticPageLayout from "./StaticPageLayout";
import { ArrowRight, Calendar, Tag, Clock, Sparkles, Zap, MessageSquare, Shield, Globe } from "lucide-react";
import SEO from "../../components/seo/SEO";

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Automation", "Marketing", "Guides", "Enterprise"];

  const posts = [
    {
      title: "How AI Agents are Revolutionizing WhatsApp Marketing",
      excerpt: "Discover how businesses are using intelligent AI agents to automate sales qualification and 24/7 client response on WhatsApp Cloud API.",
      date: "May 2025",
      readTime: "4 min read",
      author: "Aditya Singh",
      category: "Marketing",
      icon: MessageSquare,
      gradient: "from-blue-600 via-indigo-600 to-cyan-500",
      image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800",
    },
    {
      title: "The Future of Omnichannel Social Media Customer Support",
      excerpt: "Learn why unifying Instagram DMs, WhatsApp chats, and YouTube comments into a synchronized inbox reduces churn by up to 40%.",
      date: "April 2025",
      readTime: "5 min read",
      author: "Sarah Chen",
      category: "Automation",
      icon: Zap,
      gradient: "from-purple-600 via-pink-600 to-rose-500",
      image: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=800",
    },
    {
      title: "5 Strategies to Convert Instagram Comments into Warm Pipeline Leads",
      excerpt: "Technical walkthrough on configuring keyword trigger automations that immediately dispatch customized DMs and product links.",
      date: "April 2025",
      readTime: "6 min read",
      author: "Michael Ross",
      category: "Guides",
      icon: Sparkles,
      gradient: "from-amber-500 via-orange-600 to-rose-600",
      image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800",
    },
    {
      title: "Scaling Enterprise AI Workflows Without Hitting Rate Limits",
      excerpt: "Architectural deep-dive into Redis queue dispatching, BullMQ throttling, and multi-tenant webhook segregation.",
      date: "March 2025",
      readTime: "7 min read",
      author: "Priya Sharma",
      category: "Enterprise",
      icon: Shield,
      gradient: "from-emerald-600 via-teal-600 to-blue-600",
      image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800",
    },
  ];

  const filteredPosts =
    selectedCategory === "All"
      ? posts
      : posts.filter((p) => p.category === selectedCategory);

  return (
    <StaticPageLayout
      title="Graxion Flow Blog"
      subtitle="Engineering deep-dives, automation architecture, and strategic guides for modern social operations."
      badge="Engineering & Strategy"
    >
      <SEO
        title="Engineering & Automation Blog | Graxion Flow"
        description="Read articles and technical walkthroughs on WhatsApp Cloud API, Instagram automation, and autonomous multi-agent workflows."
        canonicalUrl="https://flow.graxion.in/blog"
      />

      {/* Category Filter Tabs */}
      <div className="flex items-center justify-center gap-2 flex-wrap mb-14">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              selectedCategory === cat
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Blog Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {filteredPosts.map((post, i) => (
          <article
            key={i}
            className="group rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Resilient Thumbnail with Graceful Gradient Fallback */}
              <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
                <div className={`absolute inset-0 bg-gradient-to-tr ${post.gradient} opacity-80 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500`} />
                <div className="relative z-10 text-center p-6 text-white">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <post.icon size={24} />
                  </div>
                  <span className="text-xs uppercase tracking-widest font-bold text-white/80">
                    {post.category} Insights
                  </span>
                </div>
                <span className="absolute top-4 left-4 z-20 px-3 py-1 rounded-full text-[11px] font-bold bg-black/40 backdrop-blur-md text-white border border-white/20 shadow-xs">
                  {post.category}
                </span>
              </div>

              <div className="p-7">
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} /> {post.date}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} /> {post.readTime}
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white font-display group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  {post.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                  {post.excerpt}
                </p>
              </div>
            </div>

            <div className="px-7 pb-7 pt-0 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 mt-auto">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 pt-4">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold">
                  {post.author[0]}
                </span>
                {post.author}
              </span>

              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 pt-4 group-hover:translate-x-0.5 transition-transform">
                Read article <ArrowRight size={13} />
              </span>
            </div>
          </article>
        ))}
      </div>
    </StaticPageLayout>
  );
}

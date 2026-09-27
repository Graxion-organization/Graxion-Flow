import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Briefcase, MapPin, Clock, ArrowRight, Heart, Zap, Globe, Shield, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function Careers() {
  const jobs = [
    {
      title: "Senior Full Stack Engineer (Node.js & React)",
      team: "Core Platform",
      location: "Bengaluru (Hybrid / Remote)",
      type: "Full-time",
      link: "/contact"
    },
    {
      title: "AI Research & Systems Engineer",
      team: "Intelligence",
      location: "Remote (Global)",
      type: "Full-time",
      link: "/contact"
    },
    {
      title: "Staff Product Designer",
      team: "Design & UX",
      location: "Bengaluru",
      type: "Full-time",
      link: "/contact"
    },
    {
      title: "Enterprise Solutions Architect",
      team: "Customer Success",
      location: "Mumbai / Remote",
      type: "Full-time",
      link: "/contact"
    }
  ];

  const perks = [
    {
      title: "Remote-First Flexibility",
      desc: "Work where you are most productive. We focus on outcomes, autonomy, and deep work.",
      icon: Globe,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/50"
    },
    {
      title: "Comprehensive Wellness",
      desc: "Premium health, dental, and vision insurance for you and your family members.",
      icon: Heart,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/50"
    },
    {
      title: "Meaningful Ownership",
      desc: "Every single team member receives significant equity options in our high-growth platform.",
      icon: Zap,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/50"
    },
    {
      title: "Annual Learning Stipend",
      desc: "Dedicated personal budget for books, technical workshops, and global engineering conferences.",
      icon: Shield,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/50"
    }
  ];

  return (
    <StaticPageLayout
      title="Build the Future of Social Ops"
      subtitle="Join an elite team of engineers and operators building the world's most intuitive social automation ecosystem."
      badge="We're Hiring"
    >
      {/* Perks Grid */}
      <section className="mb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display mb-3">
            Why You'll Love Building Here
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            We care deeply about craftsmanship, speed, and fostering high-agency talent.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {perks.map((perk, i) => (
            <div
              key={i}
              className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${perk.bg} ${perk.color}`}>
                <perk.icon size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                {perk.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                {perk.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Open Positions */}
      <section className="mb-16">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display">
              Open Positions
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Discover your next career leap at Graxion Flow.
            </p>
          </div>
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50">
            {jobs.length} Roles Open
          </span>
        </div>

        <div className="space-y-4">
          {jobs.map((job, i) => (
            <div
              key={i}
              className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1 block">
                  {job.team}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {job.title}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} /> {job.location}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} /> {job.type}
                  </span>
                </div>
              </div>

              <Link
                to={job.link}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all shrink-0"
              >
                Apply Now <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </StaticPageLayout>
  );
}

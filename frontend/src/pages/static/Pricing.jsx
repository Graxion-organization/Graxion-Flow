import React, { useState } from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Check, Zap, Crown, Building2, HelpCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Pricing() {
  const [annual, setAnnual] = useState(true);

  const plans = [
    {
      name: "Starter",
      icon: Zap,
      desc: "Perfect for emerging creators and single brands looking to automate customer inquiries.",
      priceMonthly: 29,
      priceAnnual: 24,
      popular: false,
      features: [
        "1,000 automated messages/month",
        "3 multi-platform AI agents",
        "OpenAI GPT-4o & Claude 3.5 Sonnet support",
        "WhatsApp, Instagram & YouTube unified inbox",
        "Basic performance analytics",
        "Community & standard email support",
      ],
      cta: "Start 14-Day Free Trial",
      href: "/register",
    },
    {
      name: "Pro",
      icon: Crown,
      desc: "For fast-scaling agencies and high-volume brands requiring deep automation and instant responses.",
      priceMonthly: 79,
      priceAnnual: 65,
      popular: true,
      features: [
        "5,000 automated messages/month",
        "10 AI workflow agents",
        "All LLM models + Voice & Media processing",
        "Lead scoring & automated CRM sync",
        "Advanced retention & throughput analytics",
        "Smart comment-to-DM triggers",
        "Priority 24/7 chat support",
        "Business hours custom routing",
      ],
      cta: "Get Started with Pro",
      href: "/register",
    },
    {
      name: "Enterprise",
      icon: Building2,
      desc: "Dedicated infrastructure, tailored SLA, and infinite scalability for large enterprise operations.",
      priceMonthly: 249,
      priceAnnual: 199,
      popular: false,
      features: [
        "50,000+ automated messages/month",
        "Unlimited AI autonomous agents",
        "Custom fine-tuned brand models",
        "Dedicated account manager & SLA guarantee",
        "Custom webhook & ERP integration",
        "Role-based access control (RBAC)",
        "SOC2 & GDPR enterprise compliance",
      ],
      cta: "Contact Sales",
      href: "/contact",
    },
  ];

  const faqs = [
    {
      q: "Can I try Graxion Flow before purchasing?",
      a: "Yes! All plans come with a 14-day fully featured free trial. No credit card required to start.",
    },
    {
      q: "Can I switch or cancel my plan anytime?",
      a: "Absolutely. You can upgrade, downgrade, or cancel your subscription at any time directly from your billing settings.",
    },
    {
      q: "Which payment methods do you support?",
      a: "We accept all major credit and debit cards, UPI, Net Banking, and international payments via Razorpay and Stripe.",
    },
    {
      q: "Are Meta API fees included?",
      a: "Graxion Flow covers all standard platform integrations. WhatsApp official Cloud API conversation charges are billed at direct Meta rates.",
    },
  ];

  return (
    <StaticPageLayout
      title="Simple, Transparent Pricing"
      subtitle="Choose the plan that fits your growth. Scale seamlessly with zero hidden fees."
      badge="14-Day Free Trial on All Plans"
    >
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4 mb-14">
        <span
          className={`text-sm font-semibold transition-colors ${
            !annual
              ? "text-slate-900 dark:text-white"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Monthly
        </span>
        <button
          onClick={() => setAnnual(!annual)}
          type="button"
          aria-label="Toggle annual billing"
          className="w-14 h-8 rounded-full bg-slate-200 dark:bg-slate-800 p-1 flex items-center transition-colors relative cursor-pointer"
        >
          <div
            className={`w-6 h-6 rounded-full bg-blue-600 shadow-md transition-transform duration-300 ${
              annual ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
        <span
          className={`text-sm font-semibold flex items-center gap-2 transition-colors ${
            annual
              ? "text-slate-900 dark:text-white"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Annual Billing
          <span className="text-[11px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Save 20%
          </span>
        </span>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 mb-24 items-stretch">
        {plans.map((p) => {
          const Icon = p.icon;
          const price = annual ? p.priceAnnual : p.priceMonthly;

          return (
            <div
              key={p.name}
              className={`rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 relative ${
                p.popular
                  ? "bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 shadow-xl shadow-blue-500/10 -translate-y-1.5"
                  : "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-white font-bold text-xs uppercase tracking-wider shadow-sm">
                  Most Popular
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      p.popular
                        ? "bg-blue-600 text-white"
                        : "bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                    {p.name}
                  </h3>
                </div>

                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed min-h-[44px]">
                  {p.desc}
                </p>

                <div className="flex items-baseline gap-1.5 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-display">
                    ${price}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    / month
                  </span>
                </div>

                <div className="space-y-3.5 mb-8">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    What's included:
                  </p>
                  {p.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-3">
                      <div className="w-4.5 h-4.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                to={p.href}
                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  p.popular
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-[0.99]"
                    : "bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.99]"
                }`}
              >
                {p.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          );
        })}
      </div>

      {/* FAQs Section */}
      <div className="max-w-3xl mx-auto mb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3 font-display">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Everything you need to know about our pricing and subscriptions.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-xs"
            >
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                {faq.q}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed pl-6.5">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </StaticPageLayout>
  );
}

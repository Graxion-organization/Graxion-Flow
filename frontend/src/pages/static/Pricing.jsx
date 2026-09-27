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
      desc: "Perfect for emerging creators and single brands looking to automate their customer inquiries.",
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
    >
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4 mb-16">
        <span className={`text-sm font-semibold ${!annual ? "text-white" : "text-gray-400"}`}>
          Monthly
        </span>
        <button
          onClick={() => setAnnual(!annual)}
          className="w-14 h-8 rounded-full bg-white/[0.08] border border-white/[0.12] p-1 flex items-center transition-colors relative"
        >
          <div
            className={`w-6 h-6 rounded-full bg-brand-500 shadow-glow-sm transition-transform duration-300 ${
              annual ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
        <span className={`text-sm font-semibold flex items-center gap-1.5 ${annual ? "text-white" : "text-gray-400"}`}>
          Annual Billing
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
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
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative ${
                p.popular
                  ? "bg-gradient-to-b from-brand-500/10 via-white/[0.03] to-transparent border-2 border-brand-500/50 shadow-glow-lg -translate-y-2"
                  : "bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12]"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-500 text-white font-bold text-xs uppercase tracking-wider shadow-glow-sm">
                  Most Popular
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      p.popular ? "bg-brand-500 text-white" : "bg-white/[0.06] text-gray-300"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-white font-display">{p.name}</h3>
                </div>

                <p className="text-gray-400 text-sm mb-6 leading-relaxed min-h-[40px]">{p.desc}</p>

                <div className="flex items-baseline gap-1 mb-8 pb-6 border-b border-white/[0.08]">
                  <span className="text-4xl sm:text-5xl font-extrabold text-white font-display">
                    ${price}
                  </span>
                  <span className="text-gray-400 text-sm font-medium">/ month</span>
                </div>

                <div className="space-y-3.5 mb-8">
                  <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    What's included:
                  </p>
                  {p.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-3">
                      <div className="w-4 h-4 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-gray-300 leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                to={p.href}
                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  p.popular
                    ? "bg-brand-500 text-white hover:bg-brand-400 shadow-glow-sm hover:scale-[1.02]"
                    : "bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]"
                }`}
              >
                {p.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          );
        })}
      </div>

      {/* FAQs */}
      <div className="max-w-3xl mx-auto mb-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 font-display">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-400 text-sm">
            Everything you need to know about our pricing and subscriptions.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
            >
              <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-brand-400 shrink-0" />
                {faq.q}
              </h4>
              <p className="text-gray-400 text-sm leading-relaxed pl-6.5">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </StaticPageLayout>
  );
}

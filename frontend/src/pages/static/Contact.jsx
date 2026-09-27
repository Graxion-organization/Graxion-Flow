import React, { useState, useEffect } from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { useBrandingStore } from "../../store";
import api from "../../services/api";
import { toast } from "react-hot-toast";

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState("");
  const { branding, fetchBranding } = useBrandingStore();

  useEffect(() => {
    fetchBranding().catch(() => {});
  }, [fetchBranding]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const response = await api.post('/public/contact', formData);
      if (response.data.status === 'success') {
        setStatus("success");
        toast.success("Message sent successfully!");
        setFormData({ name: "", email: "", subject: "", message: "" });
        setTimeout(() => setStatus(""), 4000);
      } else {
        setStatus("error");
        toast.error("Failed to send message. Please try again.");
      }
    } catch (err) {
      setStatus("error");
      toast.error("An error occurred while sending your message.");
    }
  };

  const contactInfo = [
    {
      title: "Email Us",
      value: branding?.branding_contact_email || "support@graxion.in",
      desc: "Our sales and technical team responds within 24 hours.",
      icon: Mail,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40",
    },
    {
      title: "Call Us",
      value: branding?.branding_contact_phone || "+1 (800) 123-4567",
      desc: "Monday through Friday, 9:00 AM – 6:00 PM EST.",
      icon: Phone,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40",
    },
    {
      title: "Headquarters",
      value: branding?.branding_address || "VPO Roopgarh, Jind, Haryana, India",
      desc: branding?.branding_address_desc || "Global engineering & operations hub.",
      icon: MapPin,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/40",
    },
  ];

  const inputClass =
    "w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm";

  return (
    <StaticPageLayout
      title={`Contact ${branding?.branding_site_name || "Graxion Flow"}`}
      subtitle="Ready to scale your social operations with AI? Our experts are here to help."
      badge="We're Here to Help"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
        {/* Contact Form Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2rem] p-7 sm:p-10 shadow-xs">
          <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white font-display">
            Send us a message
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
            Fill out the form below and we'll be in touch shortly.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={inputClass}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className={inputClass}
                placeholder="Enterprise inquiry, custom integration..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Message
              </label>
              <textarea
                rows="5"
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className={`${inputClass} resize-none`}
                placeholder="Tell us about your organization and requirements..."
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              {status === "sending" ? (
                "Sending..."
              ) : status === "success" ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Message Sent!
                </>
              ) : (
                <>
                  Send Message <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Contact Info Cards */}
        <div className="space-y-6">
          {contactInfo.map((info, i) => (
            <div
              key={i}
              className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start gap-5"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${info.bg} ${info.color}`}
              >
                <info.icon size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {info.title}
                </h3>
                <p className="text-slate-900 dark:text-white font-semibold text-base mb-1">
                  {info.value}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                  {info.desc}
                </p>
              </div>
            </div>
          ))}

          {/* Quick SLA Banner */}
          <div className="p-7 rounded-3xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Dedicated Technical Support
            </h4>
            <p className="text-xs text-blue-800/80 dark:text-blue-200/70 leading-relaxed">
              Active enterprise and Pro tier accounts receive priority 24/7 dedicated response channels with direct engineering escalation.
            </p>
          </div>
        </div>
      </div>
    </StaticPageLayout>
  );
}

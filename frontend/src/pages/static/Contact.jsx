import React, { useState, useEffect } from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from "lucide-react";
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
        setTimeout(() => setStatus(""), 3000);
      } else {
        setStatus("error");
        toast.error("Failed to send message");
      }
    } catch (err) {
      setStatus("error");
      toast.error("An error occurred");
    }
  };

  const contactInfo = [
    {
      title: "Email Us",
      value: branding?.branding_contact_email || "support@graxion.in",
      desc: "Our sales team responds within 24 hours.",
      icon: Mail,
      color: "text-brand-500",
      bg: "bg-brand-500/10"
    },
    {
      title: "Call Us",
      value: branding?.branding_contact_phone || "+1 (800) 123-4567",
      desc: "Mon-Fri from 9am to 6pm.",
      icon: Phone,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Headquarters",
      value: branding?.branding_address || "VPO Roopgarh, Jind, Haryana, India",
      desc: branding?.branding_address_desc || "The heart of AI innovation.",
      icon: MapPin,
      color: "text-rose-500",
      bg: "bg-rose-500/10"
    }
  ];

  const inputClass = "w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-slate-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all";

  return (
    <StaticPageLayout 
      title={`Contact ${branding?.branding_site_name || 'Sales'}`} 
      subtitle="Ready to scale with our automation platform? We're here to help you achieve enterprise success."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Contact Form */}
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-[2rem] p-8 sm:p-10 shadow-glass-lg">
          <h2 className="text-2xl font-bold mb-8 text-white font-display">Send us a Message</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={inputClass}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={inputClass}
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Subject</label>
              <input 
                type="text" 
                required
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className={inputClass}
                placeholder="How can we help?"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Message</label>
              <textarea 
                rows="5" 
                required
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                className={`${inputClass} resize-none`}
                placeholder="Tell us more about your needs..."
              ></textarea>
            </div>
            <button 
              type="submit" 
              disabled={status === "sending"}
              className={`w-full py-4 rounded-xl font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 mt-2
                ${status === "success" ? "bg-emerald-500 text-white shadow-glow-sm shadow-emerald-500/30" : 
                  status === "error" ? "bg-rose-500 text-white shadow-glow-sm shadow-rose-500/30" : 
                  "bg-brand-500 hover:bg-brand-400 text-white shadow-[0_10px_24px_rgba(34,197,94,0.2)] hover:shadow-[0_14px_34px_rgba(34,197,94,0.3)] hover:-translate-y-0.5"} 
                disabled:opacity-70 disabled:hover:translate-y-0`}
            >
              {status === "sending" ? "Sending..." : 
               status === "success" ? "Message Sent!" : 
               status === "error" ? "Error! Try Again" : 
               <><Send size={18} /> Send Message</>}
            </button>
          </form>
        </div>

        {/* Info & Details */}
        <div className="flex flex-col gap-6">
          {contactInfo.map((info, i) => (
            <div key={i} className="flex gap-5 p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors group">
              <div className={`w-14 h-14 rounded-2xl ${info.bg} ${info.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                <info.icon size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">{info.title}</h3>
                <p className="text-brand-400 font-medium mb-1.5">{info.value}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{info.desc}</p>
              </div>
            </div>
          ))}

          {/* Quick FAQ or Trust section */}
          <div className="mt-4 p-8 rounded-3xl border border-white/[0.06] bg-gradient-to-br from-[#0a1020] to-[#060912] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/[0.05] blur-[50px] rounded-full" />
            <div className="relative z-10">
              <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-500" /> Support Hours
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                Our technical support team is available 24/7 for enterprise customers. Sales inquiries are handled during business hours.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                <span className="text-brand-400 font-medium">Currently Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StaticPageLayout>
  );
}

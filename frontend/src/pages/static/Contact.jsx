import React, { useState, useEffect } from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from "lucide-react";
import { useBrandingStore } from "../../store";

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState("");
  const { branding, fetchBranding } = useBrandingStore();

  useEffect(() => {
    fetchBranding().catch(() => {});
  }, [fetchBranding]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus("sending");
    setTimeout(() => {
      setStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  const contactInfo = [
    {
      title: "Email Us",
      value: branding?.branding_contact_email || "support@graxion.com",
      desc: "Our team usually responds within 24 hours.",
      icon: Mail,
      color: "#25D366"
    },
    {
      title: "Call Us",
      value: branding?.branding_contact_phone || "+1 (800) 123-4567",
      desc: "Mon-Fri from 9am to 6pm IST.",
      icon: Phone,
      color: "#1e90ff"
    },
    {
      title: "Our Office",
      value: branding?.branding_address || "Graxion HQ, Silicon Valley, CA",
      desc: "The heart of innovation.",
      icon: MapPin,
      color: "#ff4757"
    }
  ];

  return (
    <StaticPageLayout 
      title={`Contact ${branding?.branding_site_name || 'WhatsAgent'}`} 
      subtitle="Have questions? We're here to help you automate your business success."
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "60px", alignItems: "start" }}>
        {/* Contact Form */}
        <div style={{ 
          background: "rgba(255, 255, 255, 0.02)", 
          border: "1px solid rgba(255, 255, 255, 0.05)", 
          borderRadius: "32px", 
          padding: "40px" 
        }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "28px", fontWeight: 800, marginBottom: "30px" }}>Send us a Message</h2>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div className="input-group">
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#7a9b8a" }}>Full Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" }}
                  placeholder="John Doe"
                />
              </div>
              <div className="input-group">
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#7a9b8a" }}>Email Address</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" }}
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div className="input-group">
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#7a9b8a" }}>Subject</label>
              <input 
                type="text" 
                required
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none" }}
                placeholder="How can we help?"
              />
            </div>
            <div className="input-group">
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#7a9b8a" }}>Message</label>
              <textarea 
                rows="5" 
                required
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 16px", color: "#fff", outline: "none", resize: "none" }}
                placeholder="Tell us more about your needs..."
              ></textarea>
            </div>
            <button 
              type="submit" 
              disabled={status === "sending"}
              style={{ 
                background: status === "success" ? "#1aab52" : "#25D366", 
                color: "#060a0f", 
                padding: "16px", 
                borderRadius: "14px", 
                fontWeight: 700, 
                border: "none", 
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "all 0.3s ease"
              }}
            >
              {status === "sending" ? "Sending..." : status === "success" ? "Message Sent!" : <><Send size={20} /> Send Message</>}
            </button>
          </form>
        </div>

        {/* Info & Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          {contactInfo.map((info, i) => (
            <div key={i} style={{ 
              display: "flex", 
              gap: "20px", 
              padding: "30px", 
              borderRadius: "24px", 
              background: "rgba(255,255,255,0.02)", 
              border: "1px solid rgba(255, 255, 255, 0.05)" 
            }}>
              <div style={{ 
                width: "50px", 
                height: "50px", 
                borderRadius: "15px", 
                background: "rgba(255,255,255,0.05)", 
                color: info.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <info.icon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>{info.title}</h3>
                <p style={{ color: "#fff", fontWeight: 600, fontSize: "16px", marginBottom: "4px" }}>{info.value}</p>
                <p style={{ color: "#7a9b8a", fontSize: "14px" }}>{info.desc}</p>
              </div>
            </div>
          ))}

          {/* Support Section */}
          <div style={{ 
            marginTop: "20px",
            padding: "40px", 
            borderRadius: "32px", 
            background: "linear-gradient(135deg, rgba(37, 211, 102, 0.1), transparent)", 
            border: "1px solid rgba(37, 211, 102, 0.2)" 
          }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "20px", fontWeight: 800, marginBottom: "15px", fontFamily: "Syne, sans-serif" }}>
              <MessageSquare size={24} color="#25D366" /> 24/7 Support
            </h3>
            <p style={{ color: "#7a9b8a", fontSize: "15px", lineHeight: 1.6, marginBottom: "20px" }}>
              Our AI agents are always online, but our human support team is also available for complex inquiries and enterprise setup.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#25D366", fontSize: "14px", fontWeight: 600 }}>
              <Clock size={16} /> Average response time: &lt; 2 hours
            </div>
          </div>
        </div>
      </div>
    </StaticPageLayout>
  );
}

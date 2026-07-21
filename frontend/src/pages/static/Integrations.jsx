import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Smartphone, Instagram, Send, MessageSquare, Globe, ArrowRight, Zap, Code, Shield } from "lucide-react";

export default function Integrations() {
  const integrationList = [
    {
      name: "WhatsApp",
      desc: "Connect your official WhatsApp Business API or personal number to automate customer service and sales.",
      icon: Smartphone,
      color: "#25D366",
      status: "Native",
      features: ["Auto-replies", "Bulk Broadcast", "Contact Management"]
    },
    {
      name: "Instagram",
      desc: "Manage DMs and comments automatically. Turn your Instagram followers into customers with AI-driven engagement.",
      icon: Instagram,
      color: "#E1306C",
      status: "Native",
      features: ["DM Automation", "Comment Filtering", "Lead Capture"]
    },
    {
      name: "Telegram",
      desc: "Build powerful bots and automate group/channel communications with our deep Telegram integration.",
      icon: Send,
      color: "#0088cc",
      status: "Native",
      features: ["Custom Bot Logic", "Channel Broadcast", "Webhook Support"]
    },
    {
      name: "Facebook",
      desc: "Integrate with Facebook Messenger and Pages. Handle all Meta-ecosystem queries from one single dashboard.",
      icon: MessageSquare,
      color: "#1877F2",
      status: "Native",
      features: ["Page Automation", "Messenger Bots", "Lead Sync"]
    }
  ];

  const comingSoon = [
    { name: "Shopify", icon: Zap },
    { name: "Salesforce", icon: Globe },
    { name: "Slack", icon: MessageSquare },
    { name: "HubSpot", icon: Target },
  ];

  return (
    <StaticPageLayout 
      title="Infinite Integrations" 
      subtitle="Connect Graxion Flow with the tools you already use. Scale your enterprise without switching platforms."
    >
      {/* Platform Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "30px", marginBottom: "100px" }}>
        {integrationList.map((platform, i) => (
          <div key={i} style={{ 
            padding: "40px", 
            borderRadius: "32px", 
            background: "rgba(255, 255, 255, 0.02)", 
            border: "1px solid rgba(255, 255, 255, 0.05)",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{ 
              position: "absolute", 
              top: "-20px", 
              right: "-20px", 
              width: "100px", 
              height: "100px", 
              background: `radial-gradient(circle, ${platform.color}15 0%, transparent 70%)` 
            }}></div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "30px" }}>
              <div style={{ 
                width: "60px", 
                height: "60px", 
                borderRadius: "18px", 
                background: `${platform.color}15`, 
                color: platform.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <platform.icon size={32} />
              </div>
              <span style={{ fontSize: "12px", fontWeight: 700, padding: "6px 12px", borderRadius: "100px", background: "rgba(37, 211, 102, 0.1)", color: "#25D366" }}>
                {platform.status}
              </span>
            </div>

            <h3 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "15px", fontFamily: "Syne, sans-serif" }}>{platform.name}</h3>
            <p style={{ color: "#7a9b8a", fontSize: "16px", lineHeight: 1.6, marginBottom: "30px" }}>{platform.desc}</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "30px" }}>
              {platform.features.map((feat, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", gap: "10px", color: "#e8f5ee", fontSize: "14px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: platform.color }}></div>
                  {feat}
                </div>
              ))}
            </div>

            <button style={{ 
              width: "100%", 
              background: "rgba(255, 255, 255, 0.05)", 
              color: "#fff", 
              padding: "14px", 
              borderRadius: "14px", 
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = platform.color; e.currentTarget.style.color = "#000"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; e.currentTarget.style.color = "#fff"; }}
            >
              Setup Integration <ArrowRight size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Developer API Section */}
      <section style={{ 
        padding: "80px", 
        borderRadius: "40px", 
        background: "rgba(255, 255, 255, 0.02)", 
        border: "1px solid rgba(255, 255, 255, 0.05)",
        marginBottom: "100px",
        display: "flex",
        gap: "60px",
        alignItems: "center",
        flexWrap: "wrap"
      }}>
        <div style={{ flex: "1 1 400px" }}>
          <div style={{ display: "inline-flex", padding: "10px 20px", borderRadius: "100px", background: "rgba(37, 211, 102, 0.1)", color: "#25D366", fontSize: "13px", fontWeight: 700, marginBottom: "20px" }}>
            FOR DEVELOPERS
          </div>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "36px", fontWeight: 800, marginBottom: "20px" }}>Power Your Own Apps with <span style={{ color: "#25D366" }}>Graxion API</span></h2>
          <p style={{ color: "#7a9b8a", fontSize: "17px", lineHeight: 1.8, marginBottom: "30px" }}>
            Our robust REST API allows you to integrate Graxion Flow's automation engine directly into your custom applications, CRMs, or ERPs. Send and receive messages, manage contacts, and trigger workflows programmatically.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "40px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#fff" }}>
              <Code size={20} color="#25D366" /> Comprehensive SDKs
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#fff" }}>
              <Zap size={20} color="#25D366" /> Real-time Webhooks
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#fff" }}>
              <Shield size={20} color="#25D366" /> OAuth 2.0 Security
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#fff" }}>
              <Globe size={20} color="#25D366" /> Global Edge Network
            </div>
          </div>
          <button style={{ 
            padding: "16px 36px", 
            borderRadius: "14px", 
            background: "#25D366", 
            color: "#060a0f", 
            fontWeight: 700, 
            border: "none", 
            cursor: "pointer",
            fontSize: "16px"
          }}>
            Explore API Docs
          </button>
        </div>
        <div style={{ flex: "1 1 400px", background: "#0c1117", borderRadius: "24px", padding: "30px", border: "1px solid rgba(255, 255, 255, 0.1)", fontFamily: "'Fira Code', monospace", fontSize: "14px" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ff5f56" }}></div>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ffbd2e" }}></div>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#27c93f" }}></div>
          </div>
          <pre style={{ margin: 0, color: "#d1d5db" }}>
            <code>
{`POST /v1/messages/send
{
  "to": "+919876543210",
  "type": "text",
  "content": {
    "text": "Hello from Graxion API! 🚀"
  },
  "agent_id": "agent_8x2k..."
}`}
            </code>
          </pre>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section style={{ textAlign: "center" }}>
        <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "40px", color: "#7a9b8a" }}>Coming Soon to Graxion Flow</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "40px", flexWrap: "wrap" }}>
          {comingSoon.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", opacity: 0.6 }}>
              <item.icon size={24} />
              <span style={{ fontSize: "18px", fontWeight: 600 }}>{item.name}</span>
            </div>
          ))}
        </div>
      </section>
    </StaticPageLayout>
  );
}

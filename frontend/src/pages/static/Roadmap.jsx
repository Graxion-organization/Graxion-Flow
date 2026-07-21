import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { CheckCircle2, Circle, Clock, Rocket, Zap, Globe, MessageSquare } from "lucide-react";

export default function Roadmap() {
  const roadmapData = [
    {
      quarter: "Q1 2024",
      status: "Completed",
      items: [
        { title: "WhatsApp Business API Support", icon: Zap, done: true },
        { title: "Instagram DM Automation", icon: MessageSquare, done: true },
        { title: "Basic AI Agent Training", icon: Rocket, done: true }
      ]
    },
    {
      quarter: "Q2 2024",
      status: "In Progress",
      items: [
        { title: "Telegram Bot Integration", icon: MessageSquare, done: true },
        { title: "Multi-Agent Collaboration", icon: Globe, done: false },
        { title: "Analytics Dashboard v2", icon: Zap, done: false }
      ]
    },
    {
      quarter: "Q3 2024",
      status: "Planned",
      items: [
        { title: "Shopify & WooCommerce Sync", icon: Zap, done: false },
        { title: "Custom LLM Fine-tuning", icon: Rocket, done: false },
        { title: "Voice Agent Integration", icon: Globe, done: false }
      ]
    },
    {
      quarter: "Q4 2024",
      status: "Future",
      items: [
        { title: "Global Omni-channel SDK", icon: Globe, done: false },
        { title: "AI-Powered Video Responses", icon: Rocket, done: false },
        { title: "Enterprise White-labeling", icon: Zap, done: false }
      ]
    }
  ];

  return (
    <StaticPageLayout 
      title="Graxion Flow Roadmap" 
      subtitle="Transparently building the future of enterprise automation. See what's coming next."
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto", position: "relative", padding: "40px 0" }}>
        {/* Vertical Line */}
        <div style={{ 
          position: "absolute", 
          left: "50%", 
          top: 0, 
          bottom: 0, 
          width: "2px", 
          background: "linear-gradient(to bottom, #25D366, transparent)", 
          transform: "translateX(-50%)",
          opacity: 0.3,
          display: "none" // Hidden on mobile, show on desktop if desired
        }}></div>

        <div style={{ display: "flex", flexDirection: "column", gap: "60px" }}>
          {roadmapData.map((phase, i) => (
            <div key={i} style={{ 
              display: "flex", 
              flexDirection: i % 2 === 0 ? "row" : "row-reverse", 
              gap: "40px", 
              alignItems: "center",
              flexWrap: "wrap"
            }}>
              <div style={{ flex: "1 1 400px", textAlign: i % 2 === 0 ? "right" : "left" }}>
                <div style={{ 
                  display: "inline-flex", 
                  padding: "8px 16px", 
                  borderRadius: "100px", 
                  background: phase.status === "Completed" ? "rgba(37, 211, 102, 0.1)" : "rgba(255, 255, 255, 0.05)",
                  color: phase.status === "Completed" ? "#25D366" : "#7a9b8a",
                  fontSize: "12px",
                  fontWeight: 700,
                  marginBottom: "15px",
                  textTransform: "uppercase"
                }}>
                  {phase.status}
                </div>
                <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "32px", fontWeight: 800, marginBottom: "10px" }}>{phase.quarter}</h2>
              </div>
              
              <div style={{ flex: "1 1 400px" }}>
                <div style={{ 
                  padding: "40px", 
                  borderRadius: "32px", 
                  background: "rgba(255, 255, 255, 0.02)", 
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  boxShadow: phase.status === "In Progress" ? "0 0 30px rgba(37, 211, 102, 0.1)" : "none"
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {phase.items.map((item, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <div style={{ 
                          width: "40px", 
                          height: "40px", 
                          borderRadius: "10px", 
                          background: "rgba(255,255,255,0.05)", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          color: item.done ? "#25D366" : "#7a9b8a"
                        }}>
                          <item.icon size={20} />
                        </div>
                        <span style={{ fontSize: "16px", fontWeight: 600, color: item.done ? "#fff" : "#7a9b8a", flex: 1 }}>{item.title}</span>
                        {item.done ? <CheckCircle2 size={18} color="#25D366" /> : <Clock size={18} color="#7a9b8a" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StaticPageLayout>
  );
}

import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Zap, Bug, Sparkles, Rocket, ArrowRight } from "lucide-react";

export default function Changelog() {
  const updates = [
    {
      version: "v1.2.0",
      date: "April 25, 2024",
      type: "Major Update",
      title: "Telegram & Multi-Agent Support",
      desc: "We've officially launched Telegram integration! You can now connect multiple agents to a single platform for advanced workflows.",
      items: [
        { label: "New", text: "Official Telegram Bot API support", icon: Sparkles },
        { label: "Improved", text: "AI response speed reduced to < 0.5s", icon: Zap },
        { label: "Fixed", text: "Minor bug in Instagram DM image handling", icon: Bug }
      ]
    },
    {
      version: "v1.1.5",
      date: "April 10, 2024",
      type: "Improvement",
      title: "Enhanced Lead Scoring",
      desc: "Our AI can now automatically score leads based on conversation quality and intent markers.",
      items: [
        { label: "New", text: "Visual lead scoring indicator in dashboard", icon: Sparkles },
        { label: "Fixed", text: "Resolved session timeout issue on mobile", icon: Bug }
      ]
    },
    {
      version: "v1.0.0",
      date: "March 15, 2024",
      type: "Release",
      title: "Graxion Flow Public Launch",
      desc: "The wait is over! Graxion Flow is now open to the public with support for WhatsApp and Instagram.",
      items: [
        { label: "New", text: "Public Beta access for all users", icon: Rocket },
        { label: "New", text: "Official WhatsApp Business integration", icon: Sparkles }
      ]
    }
  ];

  return (
    <StaticPageLayout 
      title="What's New" 
      subtitle="Stay up to date with the latest features, improvements, and bug fixes."
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {updates.map((update, i) => (
          <div key={i} style={{ 
            marginBottom: "80px", 
            position: "relative",
            paddingLeft: "40px",
            borderLeft: "2px solid rgba(37, 211, 102, 0.2)"
          }}>
            {/* Timeline Dot */}
            <div style={{ 
              position: "absolute", 
              left: "-9px", 
              top: "0", 
              width: "16px", 
              height: "16px", 
              borderRadius: "50%", 
              background: "#25D366", 
              border: "4px solid #060a0f",
              boxShadow: "0 0 15px rgba(37, 211, 102, 0.5)"
            }}></div>

            <div style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "15px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#25D366", fontFamily: "Syne, sans-serif" }}>{update.version}</span>
              <span style={{ fontSize: "14px", color: "#7a9b8a" }}>• {update.date}</span>
              <span style={{ 
                fontSize: "11px", 
                fontWeight: 700, 
                padding: "4px 10px", 
                borderRadius: "100px", 
                background: "rgba(255, 255, 255, 0.05)", 
                color: "#e8f5ee",
                textTransform: "uppercase"
              }}>
                {update.type}
              </span>
            </div>

            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "28px", fontWeight: 800, marginBottom: "15px" }}>{update.title}</h2>
            <p style={{ color: "#7a9b8a", fontSize: "16px", lineHeight: 1.7, marginBottom: "30px" }}>{update.desc}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {update.items.map((item, j) => (
                <div key={j} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "12px", 
                  padding: "15px 20px", 
                  borderRadius: "16px", 
                  background: "rgba(255, 255, 255, 0.02)", 
                  border: "1px solid rgba(255, 255, 255, 0.05)" 
                }}>
                   <span style={{ 
                     fontSize: "10px", 
                     fontWeight: 800, 
                     padding: "3px 8px", 
                     borderRadius: "6px", 
                     background: item.label === "New" ? "rgba(37, 211, 102, 0.1)" : item.label === "Fixed" ? "rgba(255, 95, 86, 0.1)" : "rgba(30, 144, 255, 0.1)",
                     color: item.label === "New" ? "#25D366" : item.label === "Fixed" ? "#ff5f56" : "#1e90ff",
                     textTransform: "uppercase",
                     width: "70px",
                     textAlign: "center"
                   }}>
                     {item.label}
                   </span>
                   <span style={{ color: "#e8f5ee", fontSize: "15px" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ 
          textAlign: "center", 
          padding: "40px", 
          borderRadius: "32px", 
          background: "rgba(255, 255, 255, 0.02)", 
          border: "1px dashed rgba(255, 255, 255, 0.1)" 
        }}>
          <p style={{ color: "#7a9b8a", marginBottom: "20px" }}>Want to see what's coming next?</p>
          <a href="/roadmap" style={{ color: "#25D366", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "10px" }}>
            View Product Roadmap <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </StaticPageLayout>
  );
}

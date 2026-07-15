import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Users, Globe, Target, Shield, Zap, Heart } from "lucide-react";

export default function About() {
  const stats = [
    { label: "Founded", value: "2024", icon: Globe },
    { label: "Active Users", value: "10k+", icon: Users },
    { label: "Messages Sent", value: "100M+", icon: Zap },
    { label: "Reliability", value: "99.9%", icon: Shield },
  ];

  const values = [
    {
      title: "Innovation First",
      desc: "We push the boundaries of what's possible with AI to solve real-world communication challenges.",
      icon: Zap,
      color: "#25D366"
    },
    {
      title: "Customer Centric",
      desc: "Every feature we build starts with a customer problem. Your growth is our primary metric of success.",
      icon: Heart,
      color: "#ff4757"
    },
    {
      title: "Trust & Security",
      desc: "We treat your data with the highest level of care. Security isn't a feature; it's our foundation.",
      icon: Shield,
      color: "#2f3542"
    },
    {
      title: "Global Vision",
      desc: "Built in India for the world. We're democratizing high-end AI automation for businesses everywhere.",
      icon: Globe,
      color: "#1e90ff"
    }
  ];

  return (
    <StaticPageLayout 
      title="Our Mission is to Automate" 
      subtitle="We're building the future of business communication through intelligent AI agents."
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "30px", marginBottom: "100px" }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ 
            padding: "30px", 
            borderRadius: "24px", 
            background: "rgba(255, 255, 255, 0.03)", 
            border: "1px solid rgba(255, 255, 255, 0.05)",
            textAlign: "center"
          }}>
            <div style={{ marginBottom: "15px", display: "inline-flex", padding: "12px", borderRadius: "12px", background: "rgba(37, 211, 102, 0.1)", color: "#25D366" }}>
              <stat.icon size={24} />
            </div>
            <h2 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "5px", fontFamily: "Syne, sans-serif" }}>{stat.value}</h2>
            <p style={{ color: "#7a9b8a", fontSize: "14px", fontWeight: 500 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <section style={{ marginBottom: "100px" }}>
        <div style={{ display: "flex", gap: "60px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 400px" }}>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "36px", fontWeight: 800, marginBottom: "20px" }}>The Story Behind <span style={{ color: "#25D366" }}>ZapiAI</span></h2>
            <p style={{ color: "#7a9b8a", lineHeight: 1.8, fontSize: "17px", marginBottom: "20px" }}>
              Founded in 2024, ZapiAI started as a small project to help local businesses manage their WhatsApp inquiries. We quickly realized that the problem was much larger—businesses everywhere were struggling to keep up with the demand for instant, 24/7 communication.
            </p>
            <p style={{ color: "#7a9b8a", lineHeight: 1.8, fontSize: "17px" }}>
              Today, we're a team of passionate engineers and AI specialists dedicated to building the most powerful, yet accessible, automation platform for businesses of all sizes.
            </p>
          </div>
          <div style={{ flex: "1 1 400px", position: "relative" }}>
             <div style={{ 
                width: "100%", 
                aspectRatio: "16/10", 
                borderRadius: "32px", 
                background: "linear-gradient(135deg, rgba(37, 211, 102, 0.2), rgba(26, 171, 82, 0.1))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "1px solid rgba(37, 211, 102, 0.3)"
             }}>
                <Zap size={100} color="#25D366" style={{ opacity: 0.5 }} />
             </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "100px" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "36px", fontWeight: 800, marginBottom: "15px" }}>Core Values</h2>
          <p style={{ color: "#7a9b8a", fontSize: "17px" }}>The principles that guide everything we do.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "30px" }}>
          {values.map((val, i) => (
            <div key={i} style={{ 
              padding: "40px", 
              borderRadius: "32px", 
              background: "rgba(255, 255, 255, 0.02)", 
              border: "1px solid rgba(255, 255, 255, 0.05)",
              transition: "transform 0.3s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-10px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ 
                width: "50px", 
                height: "50px", 
                borderRadius: "15px", 
                background: `rgba(${val.color === "#25D366" ? "37, 211, 102" : "255, 255, 255"}, 0.1)`, 
                color: val.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "25px"
              }}>
                <val.icon size={24} />
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>{val.title}</h3>
              <p style={{ color: "#7a9b8a", fontSize: "15px", lineHeight: 1.6 }}>{val.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ 
        padding: "60px", 
        borderRadius: "40px", 
        background: "linear-gradient(135deg, rgba(37, 211, 102, 0.1), rgba(0, 0, 0, 0.2))", 
        border: "1px solid rgba(37, 211, 102, 0.2)",
        textAlign: "center"
      }}>
        <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "32px", fontWeight: 800, marginBottom: "20px" }}>Join Our Journey</h2>
        <p style={{ color: "#7a9b8a", fontSize: "17px", marginBottom: "30px", maxWidth: "600px", margin: "0 auto 30px" }}>
          We're always looking for talented individuals who are passionate about AI and automation. Check out our open roles.
        </p>
        <button style={{ 
          background: "#25D366", 
          color: "#060a0f", 
          padding: "15px 40px", 
          borderRadius: "14px", 
          fontWeight: 700, 
          fontSize: "16px", 
          border: "none", 
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "10px"
        }}>
          View Careers <ArrowRight size={20} />
        </button>
      </div>
    </StaticPageLayout>
  );
}

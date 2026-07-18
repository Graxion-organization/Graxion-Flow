import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { ShieldCheck, Lock, Globe, Server, UserCheck, Search } from "lucide-react";

export default function Security() {
  const securityFeatures = [
    { title: "End-to-End Encryption", desc: "All data transmitted between your business and our servers is encrypted using industry-standard TLS 1.3.", icon: Lock },
    { title: "SOC 2 Type II", desc: "Our infrastructure and processes are regularly audited to ensure the highest level of security compliance.", icon: ShieldCheck },
    { title: "Secure Infrastructure", desc: "Hosted on enterprise-grade cloud providers with multi-region redundancy and DDoS protection.", icon: Server },
    { title: "Identity Management", desc: "Support for Multi-Factor Authentication (MFA) and Single Sign-On (SSO) for your team.", icon: UserCheck }
  ];

  return (
    <StaticPageLayout 
      title="Security & Trust" 
      subtitle="Your data's security is our top priority. We use world-class infrastructure to keep your business safe."
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "30px", marginBottom: "100px" }}>
        {securityFeatures.map((feature, i) => (
          <div key={i} style={{ padding: "40px", borderRadius: "32px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <div style={{ marginBottom: "20px", color: "#25D366" }}><feature.icon size={32} /></div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>{feature.title}</h3>
            <p style={{ color: "#7a9b8a", fontSize: "15px", lineHeight: 1.6 }}>{feature.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ padding: "60px", borderRadius: "40px", background: "rgba(37, 211, 102, 0.05)", border: "1px solid rgba(37, 211, 102, 0.2)", textAlign: "center" }}>
        <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "32px", fontWeight: 800, marginBottom: "20px" }}>Vulnerability Reporting</h2>
        <p style={{ color: "#7a9b8a", fontSize: "17px", marginBottom: "30px", maxWidth: "600px", margin: "0 auto 30px" }}>
          We welcome reports from security researchers. If you've found a vulnerability, please let us know.
        </p>
        <a href="mailto:security@Graxion.com" style={{ color: "#25D366", fontWeight: 700, fontSize: "18px", textDecoration: "none" }}>security@Graxion.com</a>
      </div>
    </StaticPageLayout>
  );
}

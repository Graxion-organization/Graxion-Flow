import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Shield, Lock, Eye, FileText, CheckCircle } from "lucide-react";

export default function Privacy() {
  const sections = [
    {
      title: "1. Data Collection",
      content: "We collect information that you provide directly to us when you create an account, connect your social media profiles, or contact our support team. This includes your name, email address, and communication data necessary for automation.",
      icon: Eye
    },
    {
      title: "2. How We Use Data",
      content: "Your data is used to provide, maintain, and improve our services, including processing messages, training your custom AI agents, and sending technical notices or security alerts.",
      icon: Lock
    },
    {
      title: "3. Data Protection",
      content: "We implement industry-standard security measures to protect your data from unauthorized access, alteration, or destruction. All communication with our servers is encrypted using SSL/TLS protocols.",
      icon: Shield
    },
    {
      title: "4. Third-Party Sharing",
      content: "We do not sell your personal data. We only share information with third-party service providers (like Meta for WhatsApp/Instagram) as necessary to perform the services you have requested.",
      icon: FileText
    }
  ];

  return (
    <StaticPageLayout 
      title="Privacy Policy" 
      subtitle="Last updated: April 28, 2024. Your trust is our most valuable asset."
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ marginBottom: "60px", padding: "40px", borderRadius: "32px", background: "rgba(37, 211, 102, 0.05)", border: "1px solid rgba(37, 211, 102, 0.2)" }}>
          <p style={{ fontSize: "17px", lineHeight: 1.8, color: "#e8f5ee", margin: 0 }}>
            At Graxion, we take your privacy seriously. This policy describes how we collect, use, and protect your personal information and the data handled by our Graxion Flow AI agents.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "40px", marginBottom: "80px" }}>
          {sections.map((section, i) => (
            <div key={i} style={{ display: "flex", gap: "30px" }}>
              <div style={{ flexShrink: 0, width: "48px", height: "48px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", color: "#25D366" }}>
                <section.icon size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "12px", color: "#fff" }}>{section.title}</h2>
                <p style={{ fontSize: "16px", lineHeight: 1.7, color: "#7a9b8a" }}>{section.content}</p>
              </div>
            </div>
          ))}
        </div>

        <section style={{ padding: "50px", borderRadius: "32px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "20px", fontFamily: "Syne, sans-serif" }}>GDPR & Global Compliance</h2>
          <p style={{ color: "#7a9b8a", lineHeight: 1.7, marginBottom: "30px" }}>
            Graxion is committed to complying with global data protection regulations, including the General Data Protection Regulation (GDPR). Our users have the following rights:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {[
              "Right to access your data",
              "Right to rectification",
              "Right to erasure (to be forgotten)",
              "Right to restrict processing",
              "Right to data portability",
              "Right to object"
            ].map((right, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", color: "#e8f5ee" }}>
                <CheckCircle size={18} color="#25D366" /> {right}
              </div>
            ))}
          </div>
        </section>

        <div style={{ marginTop: "60px", textAlign: "center" }}>
          <p style={{ color: "#7a9b8a" }}>
            If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@graxion.com" style={{ color: "#25D366", textDecoration: "none", fontWeight: 600 }}>privacy@graxion.com</a>.
          </p>
        </div>
      </div>
    </StaticPageLayout>
  );
}

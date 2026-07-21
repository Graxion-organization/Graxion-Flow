import React from 'react';
import StaticPageLayout from "./StaticPageLayout";
import { Shield, Trash2, Clock, CheckCircle2, AlertTriangle, ArrowRight, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DataDeletion() {
  const steps = [
    {
      title: "Step 1: Request Deletion",
      desc: "Go to your account settings and initiate the data deletion process.",
      icon: Trash2,
      color: "#ff4757"
    },
    {
      title: "Step 2: Multi-Step Verification",
      desc: "For your security, we'll send 3 unique verification codes to your registered email.",
      icon: Lock,
      color: "#1e90ff"
    },
    {
      title: "Step 3: Immediate Account Disabling",
      desc: "Once verified, your account is immediately disabled. All automated tasks and Graxion Flow agents will be paused.",
      icon: AlertTriangle,
      color: "#ffa502"
    },
    {
      title: "Step 4: 30-Day Grace Period",
      desc: "Your data is kept for 30 days. You can cancel the request by logging in and clicking 'Restore'.",
      icon: Clock,
      color: "#25D366"
    },
    {
      title: "Step 5: Permanent Deletion",
      desc: "After 30 days, all your data, including profile, tokens, and chat history, is permanently deleted.",
      icon: CheckCircle2,
      color: "#ff4757"
    }
  ];

  return (
    <StaticPageLayout 
      title="Data Deletion Policy" 
      subtitle="Your data, your choice. We believe in complete transparency and control over your enterprise data."
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        
        <div style={{ marginBottom: "60px", padding: "40px", borderRadius: "32px", background: "rgba(37, 211, 102, 0.05)", border: "1px solid rgba(37, 211, 102, 0.2)" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", color: "#25D366" }}>
              <Shield size={24} />
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: 800, margin: 0, color: "#fff", fontFamily: "Syne, sans-serif" }}>Maximum Security Verification</h2>
          </div>
          <p style={{ fontSize: "16px", lineHeight: 1.8, color: "#7a9b8a", margin: 0 }}>
            To prevent unauthorized account deletions, Graxion Flow requires a 3-step OTP verification sent to your registered email. This ensures that only the rightful enterprise owner can initiate a data wipe.
          </p>
        </div>

        <h2 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "40px", textAlign: "center", color: "#fff", fontFamily: "Syne, sans-serif" }}>How Deletion Works</h2>
        
        <div style={{ display: "grid", gap: "20px", marginBottom: "80px" }}>
          {steps.map((step, idx) => (
            <div key={idx} style={{ display: "flex", gap: "20px", padding: "30px", borderRadius: "24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", alignItems: "center" }}>
              <div style={{ width: "60px", height: "60px", borderRadius: "16px", background: `${step.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: step.color, flexShrink: 0 }}>
                <step.icon size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>{step.title}</h3>
                <p style={{ color: "#7a9b8a", fontSize: "15px", margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", padding: "60px", borderRadius: "32px", background: "linear-gradient(135deg, rgba(37, 211, 102, 0.1), transparent)", border: "1px solid rgba(37, 211, 102, 0.2)" }}>
          <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", marginBottom: "20px" }}>Ready to manage your privacy?</h3>
          <Link to="/app/settings" style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "#25D366", color: "#060a0f", padding: "16px 32px", borderRadius: "100px", fontWeight: 700, textDecoration: "none", transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform="scale(1.05)"} onMouseLeave={(e) => e.currentTarget.style.transform="scale(1)"}>
            Go to Settings <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </StaticPageLayout>
  );
}

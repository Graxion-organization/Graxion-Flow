import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { ShieldAlert, Lock, CheckCircle, Info } from "lucide-react";

export default function Terms() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing and using Graxion Flow, you agree to be bound by these Terms of Service and all applicable laws and regulations."
    },
    {
      title: "2. Use License",
      content: "Permission is granted to temporarily use our automation platform for personal or commercial business purposes, subject to the restrictions outlined in this section."
    },
    {
      title: "3. Meta Integrations (Facebook, Instagram, WhatsApp)",
      content: "When connecting Facebook, Instagram, or WhatsApp to Graxion Flow, you agree to comply with Meta's Platform Terms and Developer Policies. You grant Graxion Flow permission to manage your pages, messaging, and publishing activities as configured within the platform. We are not responsible for any actions taken by Meta regarding your account, including suspensions due to policy violations on your end."
    },
    {
      title: "4. Google and YouTube Integrations",
      content: "By connecting your YouTube account to Graxion Flow, you agree to be bound by the YouTube Terms of Service (https://www.youtube.com/t/terms) and Google Privacy Policy. You grant us permission to manage your channel content and activities as per the automation workflows you set up. Graxion Flow adheres to the Google API Services User Data Policy."
    },
    {
      title: "5. User Responsibilities",
      content: "You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account."
    },
    {
      title: "6. Limitations",
      content: "Graxion shall not be held liable for any damages arising out of the use or inability to use the Graxion Flow platform."
    }
  ];

  return (
    <StaticPageLayout 
      title="Terms of Service" 
      subtitle="Please read these terms carefully before using our platform."
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          {sections.map((section, i) => (
            <div key={i}>
              <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "15px", color: "#fff" }}>{section.title}</h2>
              <p style={{ fontSize: "16px", lineHeight: 1.7, color: "#7a9b8a" }}>{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </StaticPageLayout>
  );
}

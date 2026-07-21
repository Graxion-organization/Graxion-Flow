import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Briefcase, MapPin, Clock, ArrowRight, Heart, Zap, Globe, Shield } from "lucide-react";

export default function Careers() {
  const jobs = [
    {
      title: "Senior Full Stack Engineer",
      team: "Engineering",
      location: "Bengaluru (Remote Friendly)",
      type: "Full-time",
      link: "#"
    },
    {
      title: "AI Research Scientist",
      team: "Data Science",
      location: "Remote",
      type: "Full-time",
      link: "#"
    },
    {
      title: "Product Designer",
      team: "Design",
      location: "Bengaluru",
      type: "Full-time",
      link: "#"
    },
    {
      title: "Growth Marketing Manager",
      team: "Marketing",
      location: "Mumbai",
      type: "Full-time",
      link: "#"
    }
  ];

  const perks = [
    { title: "Remote Work", desc: "Work from anywhere in the world or join us in our beautiful offices.", icon: Globe },
    { title: "Health & Wellness", desc: "Comprehensive health insurance and wellness programs for you and your family.", icon: Heart },
    { title: "Equity Options", desc: "We want everyone to be an owner. Every full-time employee gets equity.", icon: Zap },
    { title: "Learning Budget", desc: "A generous annual budget for books, courses, and conferences.", icon: Shield }
  ];

  return (
    <StaticPageLayout 
      title="Build the Future with Us" 
      subtitle="Join a team of dreamers and doers building the world's most advanced AI automation platform."
    >
      {/* Why Join Us */}
      <section style={{ marginBottom: "100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "30px" }}>
          {perks.map((perk, i) => (
            <div key={i} style={{ 
              padding: "40px", 
              borderRadius: "32px", 
              background: "rgba(255, 255, 255, 0.02)", 
              border: "1px solid rgba(255, 255, 255, 0.05)",
              textAlign: "center"
            }}>
              <div style={{ 
                width: "60px", 
                height: "60px", 
                borderRadius: "18px", 
                background: "rgba(37, 211, 102, 0.1)", 
                color: "#25D366",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 25px"
              }}>
                <perk.icon size={28} />
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>{perk.title}</h3>
              <p style={{ color: "#7a9b8a", fontSize: "15px", lineHeight: 1.6 }}>{perk.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Open Positions */}
      <section>
        <div style={{ marginBottom: "50px" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "36px", fontWeight: 800, marginBottom: "15px" }}>Open Positions</h2>
          <p style={{ color: "#7a9b8a", fontSize: "17px" }}>Find your next challenge at Graxion Flow.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {jobs.map((job, i) => (
            <div key={i} style={{ 
              padding: "30px 40px", 
              borderRadius: "24px", 
              background: "rgba(255, 255, 255, 0.02)", 
              border: "1px solid rgba(255, 255, 255, 0.05)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "20px",
              transition: "border-color 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(37, 211, 102, 0.3)"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)"}
            >
              <div>
                <h3 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "10px", color: "#fff" }}>{job.title}</h3>
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#7a9b8a", fontSize: "14px" }}>
                     <Briefcase size={16} /> {job.team}
                   </div>
                   <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#7a9b8a", fontSize: "14px" }}>
                     <MapPin size={16} /> {job.location}
                   </div>
                   <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#7a9b8a", fontSize: "14px" }}>
                     <Clock size={16} /> {job.type}
                   </div>
                </div>
              </div>
              <button style={{ 
                background: "rgba(255, 255, 255, 0.05)", 
                color: "#fff", 
                padding: "12px 24px", 
                borderRadius: "12px", 
                border: "1px solid rgba(255, 255, 255, 0.1)",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#25D366"; e.currentTarget.style.color = "#000"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; e.currentTarget.style.color = "#fff"; }}
              >
                Apply Now <ArrowRight size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <div style={{ 
        marginTop: "100px",
        padding: "80px", 
        borderRadius: "40px", 
        background: "rgba(255, 255, 255, 0.02)", 
        border: "1px solid rgba(255, 255, 255, 0.05)",
        textAlign: "center"
      }}>
        <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: "32px", fontWeight: 800, marginBottom: "20px" }}>Don't see a role for you?</h2>
        <p style={{ color: "#7a9b8a", fontSize: "17px", marginBottom: "30px", maxWidth: "600px", margin: "0 auto 30px" }}>
          We're always looking for great people. Send us your resume and tell us how you can help Graxion Flow grow.
        </p>
        <a href="mailto:careers@graxion.com" style={{ 
          color: "#25D366", 
          fontWeight: 700, 
          fontSize: "18px", 
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: "10px"
        }}>
          careers@graxion.com <ArrowRight size={20} />
        </a>
      </div>
    </StaticPageLayout>
  );
}

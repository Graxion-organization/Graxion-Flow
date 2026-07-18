import React from "react";
import StaticPageLayout from "./StaticPageLayout";
import { Search, ArrowRight, Calendar, User, Tag } from "lucide-react";

export default function Blog() {
  const posts = [
    {
      title: "How AI Agents are Revolutionizing WhatsApp Marketing",
      excerpt: "Discover how businesses are using intelligent AI agents to automate sales and support on the world's most popular messaging app.",
      date: "April 20, 2024",
      author: "Aditya Singh",
      category: "Marketing",
      image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "The Future of Omni-channel Customer Support",
      excerpt: "Learn why a unified approach to customer communication is essential for modern brands and how Graxion makes it easy.",
      date: "April 15, 2024",
      author: "Sarah Chen",
      category: "Technology",
      image: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "5 Tips for Training Your AI Agent for Better Conversions",
      excerpt: "Technical guide on how to optimize your Graxion agent's knowledge base and personality for maximum sales performance.",
      date: "April 10, 2024",
      author: "Michael Ross",
      category: "Guide",
      image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800"
    }
  ];

  return (
    <StaticPageLayout 
      title="Graxion Blog" 
      subtitle="Insights, guides, and news from the forefront of business automation."
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "60px", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ display: "flex", gap: "15px" }}>
          {["All Posts", "Marketing", "Technology", "Guides", "Case Studies"].map((cat, i) => (
            <button key={i} style={{ 
              padding: "10px 20px", 
              borderRadius: "100px", 
              background: i === 0 ? "#25D366" : "rgba(255, 255, 255, 0.05)", 
              color: i === 0 ? "#060a0f" : "#7a9b8a",
              border: "none",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer"
            }}>{cat}</button>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)", color: "#7a9b8a" }} />
          <input 
            type="text" 
            placeholder="Search articles..." 
            style={{ 
              padding: "12px 15px 12px 45px", 
              background: "rgba(255, 255, 255, 0.05)", 
              border: "1px solid rgba(255, 255, 255, 0.1)", 
              borderRadius: "12px", 
              color: "#fff", 
              outline: "none",
              width: "300px"
            }} 
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "40px" }}>
        {posts.map((post, i) => (
          <div key={i} style={{ 
            borderRadius: "32px", 
            background: "rgba(255, 255, 255, 0.02)", 
            border: "1px solid rgba(255, 255, 255, 0.05)",
            overflow: "hidden",
            transition: "transform 0.3s ease"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-10px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ height: "240px", overflow: "hidden" }}>
              <img src={post.image} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ padding: "30px" }}>
              <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#25D366", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Tag size={14} /> {post.category}
                </span>
                <span style={{ fontSize: "12px", color: "#7a9b8a", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Calendar size={14} /> {post.date}
                </span>
              </div>
              <h3 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "15px", fontFamily: "Syne, sans-serif", lineHeight: 1.3 }}>{post.title}</h3>
              <p style={{ color: "#7a9b8a", fontSize: "15px", lineHeight: 1.6, marginBottom: "25px" }}>{post.excerpt}</p>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                    <User size={16} />
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>{post.author}</span>
                </div>
                <button style={{ background: "transparent", border: "none", color: "#25D366", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                  Read More <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </StaticPageLayout>
  );
}

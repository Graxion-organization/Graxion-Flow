import React from "react";
import { useNavigate } from "react-router-dom";

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#060a0f",
        color: "#e8f5ee",
        fontFamily: "'DM Sans', sans-serif",
        textAlign: "center",
        padding: "0 5vw",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: "rgba(37,211,102,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 40,
          marginBottom: 30,
          border: "2px solid rgba(37,211,102,0.3)",
        }}
      >
        🚧
      </div>
      <h1
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          fontWeight: 800,
          margin: "0 0 16px",
        }}
      >
        Coming <span style={{ color: "#25D366" }}>Soon</span>
      </h1>
      <p
        style={{
          color: "#7a9b8a",
          fontSize: "clamp(1rem, 2vw, 1.2rem)",
          maxWidth: 500,
          margin: "0 0 40px",
          lineHeight: 1.6,
        }}
      >
        We're working hard to bring you this page. Please check back later or
        explore other features of Graxion!
      </p>
      <button
        onClick={() => navigate("/")}
        style={{
          background: "linear-gradient(135deg, #25D366, #1aab52)",
          color: "#060a0f",
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          padding: "14px 32px",
          borderRadius: 12,
          border: "none",
          cursor: "pointer",
          fontSize: 16,
          transition: "transform 0.2s, box-shadow 0.2s",
          boxShadow: "0 0 20px rgba(37,211,102,0.4)",
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "translateY(-2px)";
          e.target.style.boxShadow = "0 0 30px rgba(37,211,102,0.6)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "none";
          e.target.style.boxShadow = "0 0 20px rgba(37,211,102,0.4)";
        }}
      >
        ← Back to Home
      </button>
    </div>
  );
}

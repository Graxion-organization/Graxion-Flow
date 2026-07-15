import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Menu, X, Sun, Moon, Zap, ArrowRight, Github, Twitter, Linkedin, Instagram, Youtube } from "lucide-react";
import { useBrandingStore } from "../../store";

// Shared Navbar for Static Pages
const StaticNavbar = ({ dark, setDark }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { branding } = useBrandingStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Features", href: "/#features" },
    { name: "How It Works", href: "/#how-it-works" },
    { name: "Pricing", href: "/#pricing" },
    { name: "Demo", href: "/#demo" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: "0 5vw",
        height: "80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: scrolled ? (dark ? "rgba(6, 10, 15, 0.85)" : "rgba(240, 250, 245, 0.85)") : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid ${dark ? "rgba(37, 211, 102, 0.2)" : "rgba(37, 211, 102, 0.1)"}` : "1px solid transparent",
        transition: "all 0.3s ease",
      }}
    >
      <div style={{ maxWidth: "1200px", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          {branding.branding_logo_url ? (
            <img src={branding.branding_logo_url} alt={branding.branding_site_name} style={{ height: "36px", maxWidth: "120px", objectFit: "contain", borderRadius: "6px" }} />
          ) : (
            <>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #25D366, #1aab52)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={20} color="#060a0f" />
              </div>
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "22px", color: dark ? "#e8f5ee" : "#0d1f14" }}>
                {branding.branding_site_name}
              </span>
            </>
          )}
        </Link>

        {/* Desktop Links */}
        <div style={{ display: "flex", gap: "30px", alignItems: "center" }} className="desktop-nav">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              style={{
                color: dark ? "#7a9b8a" : "#4a7260",
                fontSize: "15px",
                fontWeight: 500,
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#25D366")}
              onMouseLeave={(e) => (e.target.style.color = dark ? "#7a9b8a" : "#4a7260")}
            >
              {link.name}
            </a>
          ))}
          <button
            onClick={() => setDark(!dark)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: dark ? "#e8f5ee" : "#0d1f14",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px",
            }}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => navigate("/register")}
            style={{
              background: "linear-gradient(135deg, #25D366, #1aab52)",
              color: "#060a0f",
              padding: "10px 24px",
              borderRadius: "12px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              fontSize: "15px",
              boxShadow: "0 4px 15px rgba(37, 211, 102, 0.3)",
            }}
          >
            Get Started
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ display: "none", background: "transparent", border: "none", color: dark ? "#e8f5ee" : "#0d1f14" }}
          className="mobile-toggle"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <style>{`
        @media (max-width: 850px) {
          .desktop-nav { display: none !important; }
          .mobile-toggle { display: block !important; }
        }
      `}</style>

      {/* Mobile Menu */}
      {menuOpen && (
        <div style={{
          position: "fixed",
          top: "80px",
          left: 0,
          right: 0,
          background: dark ? "#060a0f" : "#f0faf5",
          padding: "20px 5vw",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          borderBottom: `1px solid ${dark ? "rgba(37, 211, 102, 0.2)" : "rgba(37, 211, 102, 0.1)"}`,
          zIndex: 999
        }}>
          {navLinks.map((link) => (
            <a key={link.name} href={link.href} onClick={() => setMenuOpen(false)} style={{ color: dark ? "#e8f5ee" : "#0d1f14", fontSize: "18px", fontWeight: 600, textDecoration: "none" }}>{link.name}</a>
          ))}
          <button onClick={() => { navigate("/register"); setMenuOpen(false); }} style={{ background: "#25D366", color: "#060a0f", padding: "12px", borderRadius: "12px", fontWeight: 700, border: "none" }}>Get Started</button>
        </div>
      )}
    </nav>
  );
};

// Shared Footer for Static Pages
const StaticFooter = ({ dark }) => {
  const { branding } = useBrandingStore();
  const currentYear = new Date().getFullYear();
  
  const footerSections = [
    {
      title: "Product",
      links: [
        { name: "Features", href: "/#features" },
        { name: "Pricing", href: "/#pricing" },
        { name: "Integrations", href: "/integrations" },
        { name: "Changelog", href: "/changelog" },
        { name: "Roadmap", href: "/roadmap" },
      ],
    },
    {
      title: "Company",
      links: [
        { name: "About Us", href: "/about-us" },
        { name: "Blog", href: "/blog" },
        { name: "Careers", href: "/careers" },
        { name: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Legal",
      links: [
        { name: "Privacy Policy", href: "/privacy-policy" },
        { name: "Terms of Service", href: "/terms-of-service" },
        { name: "Security", href: "/security" },
      ],
    },
  ];

  return (
    <footer style={{ padding: "80px 5vw 40px", background: dark ? "#04070a" : "#e8f5ee", borderTop: `1px solid ${dark ? "rgba(37, 211, 102, 0.1)" : "rgba(37, 211, 102, 0.2)"}` }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "60px", marginBottom: "60px" }}>
          <div>
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", marginBottom: "20px" }}>
              {branding.branding_logo_url ? (
                <img src={branding.branding_logo_url} alt={branding.branding_site_name} style={{ height: "30px", maxWidth: "120px", objectFit: "contain", borderRadius: "6px" }} />
              ) : (
                <>
                  <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Zap size={16} color="#060a0f" />
                  </div>
                  <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "20px", color: dark ? "#e8f5ee" : "#0d1f14" }}>
                    {branding.branding_site_name}
                  </span>
                </>
              )}
            </Link>
            <p style={{ color: dark ? "#7a9b8a" : "#4a7260", fontSize: "14px", lineHeight: 1.6, marginBottom: "24px" }}>
              The all-in-one AI automation platform for modern businesses. Streamline your customer communication with {branding.branding_site_name}.
            </p>
            <div style={{ display: "flex", gap: "15px" }}>
              {[Twitter, Github, Linkedin, Instagram].map((Icon, i) => (
                <a key={i} href="#" style={{ color: dark ? "#7a9b8a" : "#4a7260", transition: "color 0.2s" }} onMouseEnter={(e) => (e.target.style.color = "#25D366")} onMouseLeave={(e) => (e.target.style.color = dark ? "#7a9b8a" : "#4a7260")}>
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 style={{ color: dark ? "#e8f5ee" : "#0d1f14", marginBottom: "20px", fontSize: "16px", fontWeight: 700 }}>{section.title}</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link to={link.href} style={{ color: dark ? "#7a9b8a" : "#4a7260", textDecoration: "none", fontSize: "14px", transition: "color 0.2s" }} onMouseEnter={(e) => (e.target.style.color = "#25D366")} onMouseLeave={(e) => (e.target.style.color = dark ? "#7a9b8a" : "#4a7260")}>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${dark ? "rgba(37, 211, 102, 0.05)" : "rgba(37, 211, 102, 0.1)"}`, paddingTop: "30px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          <p style={{ color: dark ? "#7a9b8a" : "#4a7260", fontSize: "14px" }}>
            {branding.branding_footer_text || `© ${currentYear} ${branding.branding_site_name}. All rights reserved.`}
          </p>
          <div style={{ display: "flex", gap: "20px" }}>
            <span style={{ color: dark ? "#7a9b8a" : "#4a7260", fontSize: "14px" }}>Made with ❤️ in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const StaticPageLayout = ({ children, title, subtitle }) => {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ background: dark ? "#060a0f" : "#f0faf5", color: dark ? "#e8f5ee" : "#0d1f14", transition: "all 0.3s ease", minHeight: "100vh" }}>
      <StaticNavbar dark={dark} setDark={setDark} />
      
      {/* Header Section */}
      <header style={{ 
        padding: "160px 5vw 80px", 
        textAlign: "center", 
        background: dark ? "radial-gradient(circle at 50% 50%, rgba(37, 211, 102, 0.05) 0%, transparent 70%)" : "radial-gradient(circle at 50% 50%, rgba(37, 211, 102, 0.1) 0%, transparent 70%)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Animated Background Elements */}
        <div style={{ position: "absolute", top: "10%", left: "5%", width: "300px", height: "300px", background: "rgba(37, 211, 102, 0.03)", borderRadius: "50%", filter: "blur(60px)", zIndex: 0 }}></div>
        <div style={{ position: "absolute", bottom: "10%", right: "5%", width: "400px", height: "400px", background: "rgba(37, 211, 102, 0.02)", borderRadius: "50%", filter: "blur(80px)", zIndex: 0 }}></div>

        <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <h1 style={{ 
            fontFamily: "Syne, sans-serif", 
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)", 
            fontWeight: 800, 
            lineHeight: 1.1, 
            marginBottom: "24px",
            background: "linear-gradient(135deg, #25D366 0%, #7fffb6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ 
              fontSize: "clamp(1.1rem, 2vw, 1.4rem)", 
              color: dark ? "#7a9b8a" : "#4a7260", 
              lineHeight: 1.6,
              maxWidth: "600px",
              margin: "0 auto"
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </header>

      <main style={{ padding: "0 5vw 120px", maxWidth: "1200px", margin: "0 auto" }}>
        {children}
      </main>

      <StaticFooter dark={dark} />
    </div>
  );
};

export default StaticPageLayout;

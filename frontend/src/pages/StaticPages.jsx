import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useBrandingStore } from "../store";

export const GenericStaticPage = ({ title, content }) => {
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060a0f",
        color: "#e8f5ee",
        fontFamily: "'DM Sans', sans-serif",
        padding: "100px 5vw",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "transparent",
            color: "#25D366",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ← Back to Home
        </button>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 800,
            margin: "0 0 24px",
            color: "#fff",
          }}
        >
          {title}
        </h1>
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(37,211,102,0.18)",
            borderRadius: 24,
            padding: "40px",
            lineHeight: 1.8,
            color: "#7a9b8a",
            fontSize: 16,
          }}
        >
          {content || (
            <p>
              This page is currently under construction. Please check back later
              for updates regarding {title}. We are working hard to bring you
              the best experience possible.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Exports for specific routes
export const PrivacyPolicy = () => <GenericStaticPage title="Privacy Policy" content={<p>Your privacy is important to us. This Privacy Policy outlines how your data is collected, used, and protected when you use Graxion services. We employ industry-standard encryption and do not sell your personal data to third parties.</p>} />;
export const TermsOfService = () => <GenericStaticPage title="Terms of Service" content={<p>By using Graxion, you agree to our Terms of Service. These terms govern your use of our automation platform, API access, and related services. Please read them carefully.</p>} />;
export const CookiePolicy = () => <GenericStaticPage title="Cookie Policy" content={<p>We use cookies to improve your experience, analyze traffic, and personalize content. By continuing to use our site, you consent to our use of cookies.</p>} />;
export const GDPR = () => <GenericStaticPage title="GDPR Compliance" content={<p>Graxion is fully compliant with the General Data Protection Regulation (GDPR). Users have the right to access, modify, and request deletion of their data at any time.</p>} />;
export const Security = () => <GenericStaticPage title="Security" content={<p>We take security seriously. Our infrastructure is SOC 2 Type II compliant, and all messages are encrypted in transit and at rest.</p>} />;
export const AboutUs = () => <GenericStaticPage title="About Us" content={<p>Graxion was founded with a single mission: to make AI automation accessible to businesses of all sizes. We are a team of engineers, designers, and problem solvers passionate about the future of work.</p>} />;
export const Blog = () => <GenericStaticPage title="Blog" content={<p>Our blog is coming soon! Stay tuned for articles on AI automation, customer support strategies, and product updates.</p>} />;
export const Careers = () => <GenericStaticPage title="Careers" content={<p>We are always looking for talented individuals to join our team. If you're passionate about AI and automation, keep an eye on this page for open roles.</p>} />;
export const Press = () => <GenericStaticPage title="Press" content={<p>For press inquiries, media kits, and company announcements, please contact our PR team. Information will be updated here shortly.</p>} />;
export const Contact = () => {
  const { branding } = useBrandingStore();
  return <GenericStaticPage title="Contact Us" content={<p>Need help or have questions? Reach out to our support team at {branding?.branding_contact_email || 'support@graxion.in'}. We typically respond within 24 hours.</p>} />;
};
export const Integrations = () => <GenericStaticPage title="Integrations" content={<p>Connect Graxion with your favorite tools. We currently support WhatsApp, Instagram, Facebook, and Telegram. More CRM and support tool integrations are on the roadmap.</p>} />;
export const Changelog = () => <GenericStaticPage title="Changelog" content={<p>Keep track of all the new features, improvements, and bug fixes we push to Graxion.</p>} />;
export const Roadmap = () => <GenericStaticPage title="Roadmap" content={<p>See what we're working on next. Our public roadmap includes advanced AI training, custom LLM support, and Shopify integrations.</p>} />;

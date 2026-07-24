import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Menu, X, MessageSquare, ArrowRight, Mail, Phone, MapPin, Instagram, Youtube } from "lucide-react";
import { useBrandingStore } from "../../store";

/* ─── Shared Navbar ─── */
const StaticNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { branding } = useBrandingStore();
  const navigate = useNavigate();
  const brandName = branding?.branding_site_name || "Graxion";
  const logoUrl = branding?.branding_logo_url;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Features", href: "/#features" },
    { name: "How It Works", href: "/#workflow" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#060912]/80 backdrop-blur-xl border-b border-white/[0.06] py-3'
          : 'bg-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-8 w-auto" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-400 flex items-center justify-center shadow-glow-sm">
                <MessageSquare className="text-white h-4 w-4" />
              </div>
            )}
            <span className="text-lg font-bold text-white">{brandName}</span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              link.href.startsWith('/') ? (
                <Link key={link.name} to={link.href} className="text-sm text-gray-400 hover:text-white transition-colors font-medium">{link.name}</Link>
              ) : (
                <a key={link.name} href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors font-medium">{link.name}</a>
              )
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="px-5 py-2 text-sm text-gray-300 hover:text-white transition-colors font-medium">Sign In</button>
            <button onClick={() => navigate('/register')} className="px-5 py-2.5 text-sm font-semibold rounded-full bg-brand-500 text-white hover:bg-brand-400 transition-all shadow-glow-sm">Get Started</button>
          </div>

          <button className="md:hidden text-gray-300 hover:text-white p-2" onClick={() => setMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-[#060912]/98 backdrop-blur-2xl flex flex-col md:hidden">
          <div className="flex justify-between items-center p-5">
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-8 w-auto" />
              ) : (
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-400 flex items-center justify-center">
                  <MessageSquare className="text-white h-3.5 w-3.5" />
                </div>
              )}
              <span className="text-base font-bold text-white">{brandName}</span>
            </div>
            <button onClick={() => setMenuOpen(false)} className="text-gray-400 hover:text-white p-2">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-1 px-5 mt-6">
            {navLinks.map(link => (
              link.href.startsWith('/') ? (
                <Link key={link.name} to={link.href} onClick={() => setMenuOpen(false)} className="text-lg font-semibold text-gray-200 py-3 border-b border-white/[0.04]">{link.name}</Link>
              ) : (
                <a key={link.name} href={link.href} onClick={() => setMenuOpen(false)} className="text-lg font-semibold text-gray-200 py-3 border-b border-white/[0.04]">{link.name}</a>
              )
            ))}
          </div>
          <div className="mt-auto p-5 space-y-3">
            <button onClick={() => { setMenuOpen(false); navigate('/register'); }} className="w-full py-3.5 bg-brand-500 text-white rounded-2xl font-semibold hover:bg-brand-400 transition-colors">Get Started</button>
            <button onClick={() => { setMenuOpen(false); navigate('/login'); }} className="w-full py-3.5 bg-white/[0.04] text-white rounded-2xl font-semibold border border-white/[0.08]">Sign In</button>
          </div>
        </div>
      )}
    </>
  );
};

/* ─── Shared Footer ─── */
const StaticFooter = () => {
  const { branding } = useBrandingStore();
  const brandName = branding?.branding_site_name || "Graxion";
  const logoUrl = branding?.branding_logo_url;
  const footerText = branding?.branding_footer_text || `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`;
  const contactEmail = branding?.branding_contact_email;
  const contactPhone = branding?.branding_contact_phone;
  const socialTwitter = branding?.branding_social_twitter;
  const socialLinkedin = branding?.branding_social_linkedin;
  const socialInstagram = branding?.branding_social_instagram;
  const socialYoutube = branding?.branding_social_youtube;

  return (
    <footer className="pt-16 pb-8 border-t border-white/[0.06] bg-[#040710]">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-7 w-auto opacity-90" />
              ) : (
                <div className="h-8 w-8 bg-gradient-to-br from-brand-500 to-emerald-400 rounded-xl flex items-center justify-center">
                  <MessageSquare className="text-white h-3.5 w-3.5" />
                </div>
              )}
              <span className="text-base font-bold text-white">{brandName}</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-xs">
              The all-in-one AI automation platform for modern businesses.
            </p>
            <div className="flex items-center gap-2.5">
              {socialTwitter && <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/[0.12] transition-all"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>}
              {socialLinkedin && <a href={socialLinkedin} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/[0.12] transition-all"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>}
              {socialInstagram && <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/[0.12] transition-all"><Instagram className="w-3.5 h-3.5" /></a>}
              {socialYoutube && <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/[0.12] transition-all"><Youtube className="w-3.5 h-3.5" /></a>}
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Product</h4>
            <ul className="space-y-2.5">
              <li><a href="/#features" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Features</a></li>
              <li><Link to="/integrations" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Integrations</Link></li>
              <li><Link to="/changelog" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Changelog</Link></li>
              <li><Link to="/roadmap" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Roadmap</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Company</h4>
            <ul className="space-y-2.5">
              <li><Link to="/about-us" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">About Us</Link></li>
              <li><Link to="/blog" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Blog</Link></li>
              <li><Link to="/careers" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Careers</Link></li>
              <li><Link to="/contact" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Legal</h4>
            <ul className="space-y-2.5">
              <li><Link to="/privacy-policy" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Terms of Service</Link></li>
              <li><Link to="/security" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Security</Link></li>
              <li><Link to="/data-deletion-policy" className="text-gray-500 hover:text-brand-400 transition-colors text-sm">Data Deletion</Link></li>
            </ul>
            {(contactEmail || contactPhone) && (
              <div className="mt-5 space-y-2">
                {contactEmail && <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-gray-500 hover:text-brand-400 transition-colors text-xs"><Mail className="w-3 h-3" />{contactEmail}</a>}
                {contactPhone && <a href={`tel:${contactPhone}`} className="flex items-center gap-2 text-gray-500 hover:text-brand-400 transition-colors text-xs"><Phone className="w-3 h-3" />{contactPhone}</a>}
              </div>
            )}
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-gray-600 text-sm">{footerText}</p>
          <div className="flex items-center gap-5 text-sm text-gray-600">
            <Link to="/privacy-policy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <Link to="/terms-of-service" className="hover:text-gray-300 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

/* ─── Static Page Layout Wrapper ─── */
const StaticPageLayout = ({ children, title, subtitle }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-[#060912] text-white min-h-screen font-sans">
      <StaticNavbar />
      
      {/* Header */}
      <header className="relative pt-36 pb-16 text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/[0.04] blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-grid-white bg-grid opacity-20 pointer-events-none" />
        
        <div className="max-w-3xl mx-auto px-5 relative z-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-5 text-gradient font-display">
            {title}
          </h1>
          {subtitle && (
            <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 pb-24">
        {children}
      </main>

      <StaticFooter />
    </div>
  );
};

export default StaticPageLayout;

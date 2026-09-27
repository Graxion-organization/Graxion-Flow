import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Menu,
  X,
  MessageSquare,
  Sun,
  Moon,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Youtube,
  Globe,
  ArrowRight
} from "lucide-react";
import { useBrandingStore } from "../../store";

/* ─── Shared Static Navbar ─── */
const StaticNavbar = ({ theme, toggleTheme }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { branding } = useBrandingStore();
  const navigate = useNavigate();
  const brandName = branding?.branding_site_name || "Graxion Flow";
  const logoUrl =
    branding?.branding_logo_url ||
    "https://res.cloudinary.com/dh6uiegxw/image/upload/v1784957805/social_hub/qth6s6bzkoawy0q1qprl.png";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Features", href: "/#features", isAnchor: true },
    { name: "Integrations", href: "/integrations" },
    { name: "Pricing", href: "/pricing" },
    { name: "Roadmap", href: "/roadmap" },
    { name: "Changelog", href: "/changelog" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "glass-nav border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B0F19]/85 backdrop-blur-xl py-3 shadow-xs"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName}
                className="h-8 w-auto group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <MessageSquare className="text-white h-4.5 w-4.5" />
              </div>
            )}
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {brandName}
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md px-6 py-2 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-xs">
            {navLinks.map((link) =>
              link.isAnchor ? (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {link.name}
                </Link>
              )
            )}
          </nav>

          {/* Desktop Right CTAs + Theme Switcher */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              type="button"
              aria-label="Toggle theme"
              className="p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-xs"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-4.5 w-4.5 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="h-4.5 w-4.5 text-slate-600 transition-transform hover:-rotate-12" />
              )}
            </button>

            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 text-[14px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-5 py-2.5 text-[14px] font-bold rounded-full text-white bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 shadow-md shadow-slate-900/10 dark:shadow-blue-600/20 hover:shadow-blue-600/25 transition-all duration-300 active:scale-95"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Right Controls: Theme Toggle + Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              type="button"
              aria-label="Toggle theme"
              className="p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 shadow-xs"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
            </button>
            <button
              className="p-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 rounded-full shadow-xs border border-slate-200 dark:border-slate-800"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-white/98 dark:bg-[#080C15]/98 backdrop-blur-2xl flex flex-col md:hidden animate-fade-in">
          <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-7 w-auto" />
              ) : (
                <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center">
                  <MessageSquare className="text-white h-4 w-4" />
                </div>
              )}
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {brandName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900"
              >
                {theme === "dark" ? (
                  <Sun className="h-4.5 w-4.5 text-amber-400" />
                ) : (
                  <Moon className="h-4.5 w-4.5 text-slate-600" />
                )}
              </button>
              <button
                onClick={() => setMenuOpen(false)}
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-2 bg-slate-50 dark:bg-slate-900 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col px-6 py-6 gap-6 overflow-y-auto flex-1">
            <div className="space-y-4">
              <p className="text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Navigation
              </p>
              <a
                href="/#features"
                onClick={() => setMenuOpen(false)}
                className="block text-xl font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Features
              </a>
              <Link
                to="/integrations"
                onClick={() => setMenuOpen(false)}
                className="block text-xl font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Integrations
              </Link>
              <Link
                to="/pricing"
                onClick={() => setMenuOpen(false)}
                className="block text-xl font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Pricing
              </Link>
              <Link
                to="/roadmap"
                onClick={() => setMenuOpen(false)}
                className="block text-xl font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Roadmap
              </Link>
              <Link
                to="/changelog"
                onClick={() => setMenuOpen(false)}
                className="block text-xl font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Changelog
              </Link>
              <Link
                to="/contact"
                onClick={() => setMenuOpen(false)}
                className="block text-xl font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Contact
              </Link>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Company & Legal
              </p>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                <Link to="/about-us" onClick={() => setMenuOpen(false)} className="hover:text-blue-600">About Us</Link>
                <Link to="/blog" onClick={() => setMenuOpen(false)} className="hover:text-blue-600">Blog</Link>
                <Link to="/careers" onClick={() => setMenuOpen(false)} className="hover:text-blue-600">Careers</Link>
                <Link to="/contact" onClick={() => setMenuOpen(false)} className="hover:text-blue-600">Contact</Link>
                <Link to="/privacy-policy" onClick={() => setMenuOpen(false)} className="hover:text-blue-600">Privacy Policy</Link>
                <Link to="/terms-of-service" onClick={() => setMenuOpen(false)} className="hover:text-blue-600">Terms</Link>
                <Link to="/security" onClick={() => setMenuOpen(false)} className="hover:text-blue-600">Security</Link>
                <Link to="/cookie-policy" onClick={() => setMenuOpen(false)} className="hover:text-blue-600">Cookies</Link>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate("/register");
              }}
              className="w-full py-3.5 rounded-xl font-bold text-base text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all"
            >
              Start for free
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate("/login");
              }}
              className="w-full py-3.5 rounded-xl font-bold text-base bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs"
            >
              Sign in
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/* ─── Shared Static Footer ─── */
const StaticFooter = () => {
  const { branding } = useBrandingStore();
  const brandName = branding?.branding_site_name || "Graxion Flow";
  const logoUrl =
    branding?.branding_logo_url ||
    "https://res.cloudinary.com/dh6uiegxw/image/upload/v1784957805/social_hub/qth6s6bzkoawy0q1qprl.png";
  const footerText =
    branding?.branding_footer_text ||
    `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`;
  const contactEmail = branding?.branding_contact_email;
  const address = branding?.branding_address;

  return (
    <footer className="pt-16 pb-12 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#05080E] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Column 1: Brand & Tagline */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group inline-flex">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-7 w-auto" />
              ) : (
                <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center">
                  <MessageSquare className="text-white h-4 w-4" />
                </div>
              )}
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {brandName}
              </span>
            </Link>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">
              The modern social operations platform. Unifying WhatsApp, Instagram, and
              YouTube into one automated workspace for creators and scaling brands.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-500 hover:text-[#E1306C] hover:border-[#E1306C]/40 transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-500 hover:text-[#FF0000] hover:border-[#FF0000]/40 transition-colors"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href="https://graxion.in"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Website"
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-500/40 transition-colors"
              >
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Product */}
          <div>
            <h4 className="text-slate-900 dark:text-white font-bold mb-4 text-sm uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="/#features" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <Link to="/integrations" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Integrations
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/roadmap" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Roadmap
                </Link>
              </li>
              <li>
                <Link to="/changelog" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h4 className="text-slate-900 dark:text-white font-bold mb-4 text-sm uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/about-us" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/careers" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Contact Sales
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Policies */}
          <div>
            <h4 className="text-slate-900 dark:text-white font-bold mb-4 text-sm uppercase tracking-wider">
              Legal & Trust
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/privacy-policy" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/security" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Security
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/data-deletion-policy" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Data Deletion
                </Link>
              </li>
              <li>
                <Link to="/ai-policy" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  AI Ethics Policy
                </Link>
              </li>
              <li>
                <Link to="/acceptable-use" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Acceptable Use
                </Link>
              </li>
            </ul>
            {contactEmail && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <a
                  href={`mailto:${contactEmail}`}
                  className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 text-xs"
                >
                  <Mail className="w-3.5 h-3.5" /> {contactEmail}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <p>{footerText}</p>
          <div className="flex flex-wrap items-center gap-3.5">
            <Link to="/privacy-policy" className="hover:text-slate-900 dark:hover:text-white">Privacy</Link>
            <span>·</span>
            <Link to="/terms-of-service" className="hover:text-slate-900 dark:hover:text-white">Terms</Link>
            <span>·</span>
            <Link to="/security" className="hover:text-slate-900 dark:hover:text-white">Security</Link>
            <span>·</span>
            <Link to="/cookie-policy" className="hover:text-slate-900 dark:hover:text-white">Cookies</Link>
            {address && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                  <MapPin className="w-3.5 h-3.5" /> {address}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

/* ─── Main StaticPageLayout Wrapper ─── */
export default function StaticPageLayout({ children, title, subtitle, badge }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("app-theme") || "light";
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("app-theme", theme);
    window.dispatchEvent(new CustomEvent("app-theme-change", { detail: { theme } }));
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="gflow-sans min-h-screen bg-slate-50 dark:bg-[#080C15] text-slate-900 dark:text-slate-100 transition-colors duration-300 flex flex-col selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      <StaticNavbar theme={theme} toggleTheme={toggleTheme} />

      {/* Header Banner */}
      <header className="relative pt-32 sm:pt-40 pb-12 sm:pb-16 text-center overflow-hidden bg-gradient-to-b from-blue-50/50 via-slate-50 to-slate-50 dark:from-blue-950/20 dark:via-[#080C15] dark:to-[#080C15]">
        {/* Soft Background Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-1/4 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-gradient-to-br from-blue-200/35 via-indigo-200/25 to-purple-200/15 dark:from-blue-600/10 dark:via-indigo-600/10 dark:to-transparent rounded-full blur-[80px] -translate-y-1/3" />
          <div className="absolute bottom-0 left-1/4 w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] bg-gradient-to-tr from-emerald-100/35 to-blue-200/25 dark:from-emerald-500/10 dark:to-transparent rounded-full blur-[60px] translate-y-1/3" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
          {badge && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-5 shadow-xs">
              {badge}
            </div>
          )}

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white font-display">
            {title}
          </h1>

          {subtitle && (
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal sm:font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-20 sm:pb-28">
        {children}
      </main>

      <StaticFooter />
    </div>
  );
}

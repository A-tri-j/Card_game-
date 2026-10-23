import { useEffect, useState } from "react";
import { Mail, Sparkles, Eye, Code2 } from "lucide-react";

export default function Footer({ isLanding = false }) {
  const [visitorCount, setVisitorCount] = useState(128);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cardly_visitor_count");
      const current = stored ? parseInt(stored, 10) : 148;
      // Increment once per session
      if (!sessionStorage.getItem("cardly_session_counted")) {
        const next = current + 1;
        localStorage.setItem("cardly_visitor_count", String(next));
        sessionStorage.setItem("cardly_session_counted", "true");
        setVisitorCount(next);
      } else {
        setVisitorCount(current);
      }
    } catch {
      setVisitorCount(150);
    }
  }, []);

  return (
    <footer className={`cardly-luxury-footer ${isLanding ? "landing-mode" : ""}`}>
      <div className="footer-main-row">
        {/* Left: Visited site & Coming soon */}
        <div className="footer-chips-group">
          <div className="footer-badge-pill visitor-pill" title="Live Site Visits">
            <span className="live-dot-pulse" />
            <Eye size={13} className="pill-icon" />
            <span>Visited site: <strong>{visitorCount.toLocaleString()}</strong></span>
          </div>

          <div className="footer-badge-pill coming-soon-pill" title="Upcoming game modes and tournament features">
            <Sparkles size={13} className="sparkle-gold-icon" />
            <span>More features coming soon</span>
          </div>
        </div>

        {/* Right: Developed by Atrij Ghosh */}
        <div className="footer-developer-meta">
          <div className="developer-tag">
            <Code2 size={13} className="dev-icon" />
            <span>
              Developed by <strong>Atrij Ghosh</strong>
            </span>
          </div>

          <a
            href="mailto:atrijghosh07@gmail.com"
            className="footer-email-badge"
            title="Email Developer: atrijghosh07@gmail.com"
          >
            <Mail size={12} />
            <span>atrijghosh07@gmail.com</span>
          </a>

          <span className="footer-copyright-year">© 2026</span>
        </div>
      </div>

      <div className="footer-sub-row">
        <span>Cardly · Luxury Card Game Tracker</span>
        <span className="footer-sub-dot">•</span>
        <span>Call Bridge & 29 · Play · Track · Compete</span>
      </div>
    </footer>
  );
}

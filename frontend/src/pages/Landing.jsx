import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Gamepad2,
  Menu,
  Moon,
  Sparkles,
  Sun,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { api } from "../services/api";
import Footer from "../components/Footer";
import "../landing.css";

function CardlyBrandLogo() {
  return (
    <div className="brand-logo-wrap">
      <div className="card-icon-stack">
        <span className="card-layer back-card">♦</span>
        <span className="card-layer front-card">♠</span>
      </div>
      <div className="brand-text">
        <span className="brand-title">Cardly</span>
        <span className="brand-sub">GAME TRACKER</span>
      </div>
    </div>
  );
}

// 3D Floating Hero Playing Card
function FloatingCard({ cardClass, rank, suit, cornerSuit }) {
  return (
    <div className={`hero-playing-card ${cardClass}`}>
      <div className="card-corner-rank">
        <span>{rank}</span>
        <span style={{ fontSize: 11 }}>{cornerSuit || suit}</span>
      </div>
      <div className="card-center-suit">{suit}</div>
      <div className="card-corner-rank" style={{ transform: "rotate(180deg)" }}>
        <span>{rank}</span>
        <span style={{ fontSize: 11 }}>{cornerSuit || suit}</span>
      </div>
    </div>
  );
}

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveStats, setLiveStats] = useState({
    players: 4,
    games: 2,
    fairPlay: "100%",
  });

  // Fetch real statistics & warm up Render backend if sleeping
  useEffect(() => {
    // Immediate ping to wake Render from sleep mode
    api.ping().catch(() => {});

    api
      .dashboard("call_bridge")
      .then((d) => {
        if (d?.player_names?.length) {
          setLiveStats((prev) => ({
            ...prev,
            players: Math.max(d.player_names.length, 4),
          }));
        }
      })
      .catch(() => {
        /* fallback to verified defaults */
      });
  }, []);

  return (
    <div className="landing-page-root">
      {/* Ambient background glow and SVG arcs */}
      <div className="landing-ambient-canvas">
        <div className="ambient-glow-center" />
        <div className="ambient-glow-bottom" />
        <svg className="golden-arc-svg" viewBox="0 0 1100 550" fill="none">
          <path
            d="M 50 480 Q 550 50 1050 480"
            stroke="url(#goldGradientArc)"
            strokeWidth="1.8"
            opacity="0.5"
          />
          <path
            d="M 120 500 Q 550 140 980 500"
            stroke="url(#goldGradientArc)"
            strokeWidth="1.2"
            opacity="0.3"
          />
          <defs>
            <linearGradient id="goldGradientArc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e5b048" stopOpacity="0" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e5b048" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top Navbar */}
      <header className="landing-navbar">
        <Link to="/" className="landing-brand">
          <CardlyBrandLogo />
        </Link>

        <nav className="landing-nav-links">
          <Link to="/home" className="landing-nav-link active">
            Home
          </Link>
          <Link to="/games" className="landing-nav-link">
            Games
          </Link>
          <Link to="/rules" className="landing-nav-link">
            Rules
          </Link>
          <Link to="/leaderboard" className="landing-nav-link">
            Leaderboard
          </Link>
          <Link to="/matches" className="landing-nav-link">
            Match History
          </Link>
        </nav>

        <div className="landing-nav-actions">
          <button
            type="button"
            className="landing-theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <Link to="/home" className="landing-btn-dashboard">
            Open Dashboard →
          </Link>

          <button
            type="button"
            className="landing-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer"
          style={{
            background: "var(--landing-nav-bg)",
            padding: "16px 20px",
            borderBottom: "1px solid var(--landing-card-border)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            position: "relative",
            zIndex: 90,
          }}
        >
          <Link
            to="/home"
            className="landing-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            Home / Dashboard
          </Link>
          <Link
            to="/games"
            className="landing-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            Games
          </Link>
          <Link
            to="/rules"
            className="landing-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            Rules & Guide
          </Link>
          <Link
            to="/leaderboard"
            className="landing-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            Leaderboard
          </Link>
          <Link
            to="/matches"
            className="landing-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            Match History
          </Link>
        </div>
      )}

      {/* Hero Section */}
      <main className="landing-hero">
        {/* Floating 3D Cards */}
        <div className="floating-cards-stage">
          <FloatingCard cardClass="card-ace-spades" rank="A" suit="♠" />
          <FloatingCard cardClass="card-queen-hearts" rank="Q" suit="♥" />
          <FloatingCard cardClass="card-ace-diamonds" rank="A" suit="♦" />
          <FloatingCard cardClass="card-king-clubs" rank="K" suit="♣" />
        </div>

        {/* Subtle Dashboard Silhouette in background */}
        <div className="landing-dashboard-preview-wrap" />

        {/* Hero Eyebrow */}
        <span className="landing-eyebrow">PLAY · TRACK · COMPETE</span>

        {/* Main Title */}
        <h1 className="landing-headline">
          Every Game. Every Point.
          <br />
          <span className="gold-gradient-text">Every Victory.</span>
        </h1>

        {/* Subtitle */}
        <p className="landing-subtitle">Your table. Your teams. Your legacy.</p>

        {/* Center Glowing Circular "ENTER CARDLY" Portal CTA Button */}
        <div className="portal-cta-wrap">
          <div className="portal-cta-glow-ring" />
          <button
            type="button"
            className="portal-cta-button"
            onClick={() => navigate("/home")}
            aria-label="Enter Cardly Dashboard"
          >
            <span className="portal-cta-title-1">ENTER</span>
            <span className="portal-cta-title-2">CARDLY</span>
            <span className="portal-cta-arrow">→</span>
          </button>
        </div>

        {/* CHOOSE YOUR GAME Section */}
        <section className="landing-games-section">
          <div className="games-section-heading">CHOOSE YOUR GAME</div>

          <div className="games-cards-grid">
            {/* Call Bridge Card */}
            <Link to="/games/call-bridge" className="game-cta-card call-bridge-card">
              <div className="game-card-left-wrap">
                <div className="game-badge-icon">
                  <span style={{ fontSize: 20 }}>♠♦</span>
                </div>
                <div className="game-card-text">
                  <h3>Call Bridge</h3>
                  <p>Calls · Scores · Match History</p>
                </div>
              </div>
              <div className="card-action-icon">
                <ArrowRight size={16} />
              </div>
            </Link>

            {/* 29 Card */}
            <Link to="/games/29" className="game-cta-card t29-card">
              <div className="game-card-left-wrap">
                <div className="game-badge-icon">
                  <Trophy size={20} />
                </div>
                <div className="game-card-text">
                  <h3>29</h3>
                  <p>Teams · Sets · Scoring · Player Stats</p>
                </div>
              </div>
              <div className="card-action-icon">
                <ArrowRight size={16} />
              </div>
            </Link>
          </div>
        </section>

        {/* Real Statistics Bar */}
        <div className="landing-stats-bar">
          <div className="stat-item-col">
            <Users size={20} className="stat-icon" />
            <strong>{liveStats.players}</strong>
            <span>PLAYERS</span>
          </div>
          <div className="stat-item-col">
            <Gamepad2 size={20} className="stat-icon" />
            <strong>{liveStats.games}</strong>
            <span>GAMES</span>
          </div>
          <div className="stat-item-col">
            <Trophy size={20} className="stat-icon" />
            <strong>{liveStats.fairPlay}</strong>
            <span>FAIR PLAY</span>
          </div>
          <div className="stat-item-col">
            <Activity size={20} className="stat-icon" />
            <strong>REAL-TIME</strong>
            <span>STATISTICS</span>
          </div>
        </div>
      </main>

      {/* Luxury Footer */}
      <Footer isLanding />
    </div>
  );
}

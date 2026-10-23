import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BookOpen, Clock3, Gamepad2, Home, Moon, Sun, Trophy } from "lucide-react";
import { api } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const navigation = [
  { to: "/home", label: "Home", icon: Home, end: true },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/matches", label: "Match history", icon: Clock3 },
];

const mobileNavItems = [
  { to: "/home", label: "Home", icon: Home, end: true },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/rules/call-bridge", label: "Rules", icon: BookOpen },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/matches", label: "History", icon: Clock3 },
];

function CardlyLogo() {
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

export default function Layout() {
  const [apiStatus, setApiStatus] = useState("checking");
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Render Sleep-Prevention & Auto-Warmup Hook:
  // If Render is sleeping, auto-retries every 5 seconds until awake.
  // Once online, sends a background heartbeat ping every 4 minutes to keep Render alive.
  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const pingServer = async () => {
      try {
        await api.ping();
        if (!cancelled) {
          setApiStatus("online");
          // Server is awake, schedule keep-alive heartbeat in 4 minutes (240s)
          timer = setTimeout(pingServer, 240000);
        }
      } catch {
        if (!cancelled) {
          setApiStatus("waking");
          // Server is sleeping/spinning up, auto-retry every 5 seconds
          timer = setTimeout(pingServer, 5000);
        }
      }
    };

    pingServer();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div className="app-shell">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <NavLink to="/" className="mobile-brand">
          <CardlyLogo />
        </NavLink>
        <div className="mobile-header-actions">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <NavLink className="brand" to="/">
          <CardlyLogo />
        </NavLink>

        <p className="nav-label">WORKSPACE</p>
        <nav className="nav-list">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <Icon size={18} className="nav-icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Game Rules Card with Sub-boxes for Call Bridge & 29 */}
        <div className="sidebar-rules-section">
          <p className="nav-label">GAME RULES</p>
          <div className="sidebar-rules-card">
            <div className="sidebar-rules-header">
              <BookOpen size={13} />
              <span>OFFICIAL RULES</span>
            </div>
            <NavLink
              to="/rules/call-bridge"
              className={({ isActive }) =>
                `sidebar-sub-item ${
                  isActive || location.pathname === "/rules" ? "active" : ""
                }`
              }
            >
              <span className="sidebar-sub-badge" style={{ color: "#a78bfa" }}>♠</span>
              <span>Call Bridge</span>
            </NavLink>
            <NavLink
              to="/rules/29"
              className={({ isActive }) => `sidebar-sub-item ${isActive ? "active" : ""}`}
            >
              <span className="sidebar-sub-badge" style={{ color: "var(--badge-green-text)" }}>🏆</span>
              <span>29 (Twenty-Nine)</span>
            </NavLink>
          </div>
        </div>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="theme-switch-row"
            onClick={toggleTheme}
            title="Toggle Dark / Light Mode"
          >
            <span className="theme-switch-icon">
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </span>
            <span className="theme-switch-text">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
            <span className={`theme-pill ${theme}`}>{theme}</span>
          </button>

          <div className="sidebar-status-box">
            <span className={`api-indicator ${apiStatus}`}>
              <span className="status-dot" />
              {apiStatus === "checking"
                ? "Connecting..."
                : apiStatus === "waking"
                  ? "Waking server..."
                  : apiStatus === "online"
                    ? "API connected"
                    : "API offline"}
            </span>
          </div>

          <div className="sidebar-caption">
            <strong>Cardly · Card Game Tracker</strong>
            <small>Track · Play · Compete</small>
          </div>
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="main-content">
        <div className="content-container">
          <Outlet />
        </div>
        <footer className="footer">
          <div className="footer-left">Cardly – Card Game Tracker</div>
          <div className="footer-right">Built for your next great game.</div>
        </footer>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
        {mobileNavItems.map(({ to, label, icon: Icon, end }) => {
          const isActive = end
            ? location.pathname === to
            : to.startsWith("/rules")
              ? location.pathname.startsWith("/rules")
              : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={`mobile-nav-tab ${isActive ? "active" : ""}`}
            >
              <Icon size={20} className="tab-icon" />
              <span className="tab-label">{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

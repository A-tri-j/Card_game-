import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Clock3, Gamepad2, Home, Moon, Sun, Trophy } from "lucide-react";
import { api } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const navigation = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/matches", label: "Match history", icon: Clock3 },
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

  useEffect(() => {
    let cancelled = false;
    api
      .health()
      .then(() => !cancelled && setApiStatus("online"))
      .catch(() => !cancelled && setApiStatus("offline"));
    return () => {
      cancelled = true;
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

      {/* Mobile Bottom Navigation Bar (Shown in mockup!) */}
      <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
        {navigation.map(({ to, label, icon: Icon, end }) => {
          const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={`mobile-nav-tab ${isActive ? "active" : ""}`}
            >
              <Icon size={20} className="tab-icon" />
              <span className="tab-label">{label === "Match history" ? "History" : label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

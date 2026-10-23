import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Frown,
  Gamepad2,
  Plus,
  Trophy,
  User,
  Users,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import MatchRow from "../components/MatchRow";
import { api } from "../services/api";
import { getCreator } from "../utils/tokens";

const PLAYER_KEY = "cardly:dashboard-player";

function loadPlayer() {
  try {
    return localStorage.getItem(PLAYER_KEY) || getCreator();
  } catch {
    return getCreator();
  }
}

// Custom Luxury Player Dropdown
function PlayerPicker({ value, options = [], onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="player-picker-container" ref={ref}>
      <button
        type="button"
        className={`player-picker-pill ${open ? "is-open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="picker-avatar">
          {value ? value.charAt(0).toUpperCase() : <User size={13} />}
        </div>
        <span className="picker-name">{value || "Choose player"}</span>
        <ChevronDown size={14} className={`picker-chevron-icon ${open ? "rotated" : ""}`} />
      </button>

      {open && (
        <div className="player-dropdown-menu" role="listbox">
          <button
            type="button"
            className={`dropdown-item ${!value ? "selected" : ""}`}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            <div className="item-avatar all-avatar">
              <Users size={12} />
            </div>
            <span className="item-label">All players (Overview)</span>
            {!value && <Check size={14} className="check-icon" />}
          </button>

          {options.length > 0 && <div className="dropdown-divider" />}

          {options.map((name, idx) => {
            const isSelected = value === name;
            const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            return (
              <button
                key={name}
                type="button"
                className={`dropdown-item ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
              >
                <div
                  className="item-avatar"
                  style={{
                    background: color.bg,
                    borderColor: color.border,
                    color: color.text,
                  }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="item-label">{name}</span>
                {isSelected && <Check size={14} className="check-icon" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Laurel Wreath + Crown Vector Emblem matching user mockup
function LaurelCrown({ color = "#e5b048" }) {
  return (
    <svg width="46" height="34" viewBox="0 0 48 38" fill="none" xmlns="http://www.w3.org/2000/svg" className="laurel-crown-svg">
      {/* Crown */}
      <path d="M19 14L24 7.5L29 14L35 9.5L33 19H15L13 9.5L19 14Z" fill={color} fillOpacity="0.95" />
      <circle cx="24" cy="6.5" r="1.5" fill={color} />
      <circle cx="13" cy="8.5" r="1.3" fill={color} />
      <circle cx="35" cy="8.5" r="1.3" fill={color} />
      {/* Left Laurel Leaves */}
      <path d="M12 28C10 24 9 19 11 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <path d="M8 23C6 21 7 18 10 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <path d="M8 29C6 27 7 24 10 24" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <path d="M13 33C10 32 10 28 13 28" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <path d="M18 35C14 35 14 32 17 31" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      {/* Right Laurel Leaves */}
      <path d="M36 28C38 24 39 19 37 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <path d="M40 23C42 21 41 18 38 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <path d="M40 29C42 27 41 24 38 24" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <path d="M35 33C38 32 38 28 35 28" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <path d="M30 35C34 35 34 32 31 31" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

const AVATAR_COLORS = [
  { bg: "rgba(121, 80, 242, 0.2)", border: "#a78bfa", text: "#d8c9ff" },
  { bg: "rgba(229, 176, 72, 0.2)", border: "#f59e0b", text: "#fde68a" },
  { bg: "rgba(16, 185, 129, 0.2)", border: "#10b981", text: "#a7f3d0" },
  { bg: "rgba(244, 63, 94, 0.2)", border: "#f43f5e", text: "#fecdd3" },
  { bg: "rgba(14, 165, 233, 0.2)", border: "#38bdf8", text: "#bae6fd" },
];

export default function Home() {
  const [game, setGame] = useState("call_bridge");
  const [player, setPlayer] = useState(loadPlayer());
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let off = false;
    setError("");
    api
      .dashboard(game, player)
      .then((d) => !off && setData(d))
      .catch((e) => !off && setError(e.message));
    return () => {
      off = true;
    };
  }, [game, player]);

  useEffect(() => {
    api.listMatches("?status=completed&limit=5").then(setRecent).catch(() => setRecent([]));
  }, []);

  function choosePlayer(name) {
    setPlayer(name);
    try {
      localStorage.setItem(PLAYER_KEY, name);
    } catch {
      /* ignore */
    }
  }

  const p = data?.player;
  const hasPlayer = Boolean(player);

  return (
    <>
      <PageHeader eyebrow="YOUR GAME SPACE" title="Home">
        <PlayerPicker
          value={player}
          options={data?.player_names || []}
          onChange={choosePlayer}
        />
      </PageHeader>

      {/* Game Switcher Tabs */}
      <div className="filter-capsule">
        <button
          type="button"
          className={`filter-pill ${game === "call_bridge" ? "active" : ""}`}
          onClick={() => setGame("call_bridge")}
        >
          Call Bridge
        </button>
        <Link
          className="filter-pill"
          to="/games/29"
        >
          29
        </Link>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!data && !error && <div className="skeleton tall" />}

      {data && (
        <>
          {/* Top 4 KPI Cards */}
          <section className="kpi-grid">
            <Link to="/matches" className="kpi-card" title="View matches">
              <div className="kpi-top">
                <span className="kpi-icon-badge purple">
                  <Gamepad2 size={20} />
                </span>
                <span className="kpi-arrow"><ChevronRight size={16} /></span>
              </div>
              <span className="kpi-label">TOTAL MATCHES</span>
              <strong className="kpi-value">
                {hasPlayer ? (p?.matches ?? 0) : data.total_matches}
              </strong>
              <small className="kpi-sub">Completed matches</small>
            </Link>

            <article className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-icon-badge gold">
                  <Trophy size={20} />
                </span>
                <span className="kpi-arrow"><ChevronRight size={16} /></span>
              </div>
              <span className="kpi-label">CHAMPION</span>
              <strong className="kpi-value">
                {hasPlayer ? (p?.first ?? 0) : "—"}
              </strong>
              <small className="kpi-sub">1st place count</small>
            </article>

            <article className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-icon-badge red">
                  <Frown size={20} />
                </span>
                <span className="kpi-arrow"><ChevronRight size={16} /></span>
              </div>
              <span className="kpi-label">LOSER</span>
              <strong className="kpi-value">
                {hasPlayer ? (p?.loser ?? 0) : "—"}
              </strong>
              <small className="kpi-sub">Last place count</small>
            </article>

            <article className="kpi-card">
              <div className="kpi-top">
                <span className="kpi-icon-badge green">
                  <Activity size={20} />
                </span>
                <span className="kpi-arrow"><ChevronRight size={16} /></span>
              </div>
              <span className="kpi-label">WIN RATE</span>
              <strong className="kpi-value">
                {hasPlayer ? `${p?.win_rate ?? 0}%` : "—"}
              </strong>
              <small className="kpi-sub">
                {p ? `Rank #${p.rank} · avg ${p.avg_score}` : "Select player for rank"}
              </small>
            </article>
          </section>

          {/* Place Cards (1st, 2nd, 3rd, 4th place) with Laurel Wreaths */}
          <section className="place-grid">
            <div className="place-card place-1">
              <div className="place-icon-wrap">
                <LaurelCrown color="#f59e0b" />
              </div>
              <span className="place-label">1st place</span>
              <strong className="place-count">{p?.first ?? 0}</strong>
            </div>

            <div className="place-card place-2">
              <div className="place-icon-wrap">
                <LaurelCrown color="#94a3b8" />
              </div>
              <span className="place-label">2nd place</span>
              <strong className="place-count">{p?.second ?? 0}</strong>
            </div>

            <div className="place-card place-3">
              <div className="place-icon-wrap">
                <LaurelCrown color="#d97706" />
              </div>
              <span className="place-label">3rd place</span>
              <strong className="place-count">{p?.third ?? 0}</strong>
            </div>

            <div className="place-card place-4">
              <div className="place-icon-wrap">
                <LaurelCrown color="#c084fc" />
              </div>
              <span className="place-label">4th place</span>
              <strong className="place-count">{p?.fourth ?? 0}</strong>
            </div>
          </section>

          {/* Bottom Grid: Leaderboard & Recent Matches */}
          <section className="dashboard-columns">
            {/* Left: Top Players Leaderboard */}
            <article className="content-card">
              <div className="card-header">
                <div>
                  <span className="eyebrow-badge">
                    <Users size={13} className="eyebrow-icon" />
                    TOP PLAYERS
                  </span>
                  <h3 className="card-title">Leaderboard</h3>
                </div>
                <Link to="/leaderboard" className="card-link-action">
                  See all <span className="arrow">→</span>
                </Link>
              </div>

              {data.top.length === 0 ? (
                <div className="empty-state">
                  <strong>No completed matches yet</strong>
                  <p>Finish a match to view real rankings.</p>
                </div>
              ) : (
                <div className="leaderboard-mini-table">
                  <div className="mini-table-head">
                    <span className="th-rank">#</span>
                    <span className="th-player">Player</span>
                    <span className="th-matches">Matches</span>
                  </div>
                  <div className="mini-table-body">
                    {data.top.map((s, idx) => {
                      const avatar = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                      return (
                        <div key={s.player_id} className="mini-table-row">
                          <span className="row-rank-num">{idx + 1}</span>
                          <div className="row-player-info">
                            <span
                              className="player-avatar-circle"
                              style={{
                                background: avatar.bg,
                                borderColor: avatar.border,
                                color: avatar.text,
                              }}
                            >
                              {s.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="player-names-block">
                              <strong className="player-real-name">{s.name}</strong>
                              <span className="player-sub-stats">
                                {s.first} wins · {s.matches} matches
                              </span>
                            </div>
                          </div>
                          <span className="row-matches-count">{s.matches}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>

            {/* Right: Recent Matches */}
            <article className="content-card">
              <div className="card-header">
                <div>
                  <span className="eyebrow-badge">
                    <Clock size={13} className="eyebrow-icon" />
                    RECENT ACTIVITY
                  </span>
                  <h3 className="card-title">Recent matches</h3>
                </div>
                <Link to="/games/call-bridge" className="action-button-purple">
                  <Plus size={14} /> New match
                </Link>
              </div>

              {!recent && <div className="skeleton" />}
              {recent && recent.length === 0 && (
                <div className="empty-state">
                  <strong>No completed matches yet</strong>
                  <p>Start a new game to begin tracking your history.</p>
                </div>
              )}
              {recent && recent.length > 0 && (
                <div className="recent-matches-list">
                  {recent.map((m) => (
                    <MatchRow key={m.id} match={m} />
                  ))}
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </>
  );
}

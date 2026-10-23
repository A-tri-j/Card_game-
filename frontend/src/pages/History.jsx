import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Gamepad2, Plus, Search, Trophy, X } from "lucide-react";
import PageHeader from "../components/PageHeader";
import MatchRow from "../components/MatchRow";
import { api } from "../services/api";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

export default function History() {
  const [activeGame, setActiveGame] = useState("call_bridge"); // 'call_bridge' | '29'
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setMatches(null);
    setError("");

    if (activeGame === "call_bridge") {
      const query = `?limit=100${status ? `&status=${status}` : ""}`;
      api
        .listMatches(query)
        .then(setMatches)
        .catch((e) => setError(e.message));
    } else {
      const query = status ? `?status=${status}` : "";
      api.t29
        .history(query)
        .then(setMatches)
        .catch((e) => setError(e.message));
    }
  }, [activeGame, status]);

  // Filter matches by player name search
  const filteredMatches = useMemo(() => {
    if (!matches) return [];
    if (!searchQuery.trim()) return matches;
    const q = searchQuery.toLowerCase().trim();

    return matches.filter((m) => {
      if (activeGame === "call_bridge") {
        return (m.players || []).some((p) => p.name.toLowerCase().includes(q));
      } else {
        const home = m.home?.label?.toLowerCase() || "";
        const away = m.away?.label?.toLowerCase() || "";
        const room = m.room_name?.toLowerCase() || "";
        const creator = m.created_by?.toLowerCase() || "";
        return home.includes(q) || away.includes(q) || room.includes(q) || creator.includes(q);
      }
    });
  }, [matches, searchQuery, activeGame]);

  // Compute summary stats
  const stats = useMemo(() => {
    if (!matches) return { total: 0, completed: 0, inProgress: 0 };
    return {
      total: matches.length,
      completed: matches.filter((m) => m.status === "completed").length,
      inProgress: matches.filter((m) => m.status === "in_progress" || m.status === "setup").length,
    };
  }, [matches]);

  const newMatchUrl = activeGame === "call_bridge" ? "/games/call-bridge" : "/games/29";

  return (
    <div className="matches-page-wrap">
      {/* Page Header with Action Button */}
      <div className="page-header-row">
        <PageHeader eyebrow="YOUR ARCHIVE" title="Match history" />
        <Link to={newMatchUrl} className="action-button-purple">
          <Plus size={15} /> New match
        </Link>
      </div>

      {/* Game Switcher Capsule (Matches Home page) */}
      <div className="filter-pill-capsule" role="tablist" aria-label="Game Type">
        <button
          type="button"
          className={`filter-pill ${activeGame === "call_bridge" ? "active" : ""}`}
          onClick={() => {
            setActiveGame("call_bridge");
            setStatus("");
            setSearchQuery("");
          }}
        >
          Call Bridge
        </button>
        <button
          type="button"
          className={`filter-pill ${activeGame === "29" ? "active" : ""}`}
          onClick={() => {
            setActiveGame("29");
            setStatus("");
            setSearchQuery("");
          }}
        >
          29
        </button>
      </div>

      {/* 3 Quick Summary Mini-Stats Cards */}
      <section className="history-stats-grid">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon-badge purple">
              <Gamepad2 size={18} />
            </span>
          </div>
          <span className="kpi-label">TOTAL MATCHES</span>
          <strong className="kpi-value">{matches ? stats.total : "—"}</strong>
          <small className="kpi-sub">Recorded archive</small>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon-badge gold">
              <Trophy size={18} />
            </span>
          </div>
          <span className="kpi-label">COMPLETED</span>
          <strong className="kpi-value">{matches ? stats.completed : "—"}</strong>
          <small className="kpi-sub">Final results tallied</small>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon-badge green">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <span className="kpi-label">IN PROGRESS</span>
          <strong className="kpi-value">{matches ? stats.inProgress : "—"}</strong>
          <small className="kpi-sub">Active or playable</small>
        </div>
      </section>

      {/* Toolbar: Search input + Status Chips */}
      <div className="history-toolbar">
        <div className="search-box-pill">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input-field"
            placeholder={
              activeGame === "call_bridge"
                ? "Filter by player name..."
                : "Search by player, team, or room..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="filter-chips-row" role="tablist" aria-label="Filter status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`filter-pill-chip ${status === f.value ? "active" : ""}`}
              onClick={() => setStatus(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Matches List Section */}
      <section className="content-card matches-content-card">
        <div className="card-header matches-card-header">
          <div>
            <span className="eyebrow-badge">
              <Clock size={13} className="eyebrow-icon" />
              {activeGame === "call_bridge" ? "CALL BRIDGE ARCHIVE" : "29 GAME ARCHIVE"}
            </span>
            <h3 className="card-title">
              {status ? `${STATUS_FILTERS.find((f) => f.value === status)?.label} matches` : "All matches"}
              {filteredMatches && (
                <span className="matches-counter-badge">{filteredMatches.length}</span>
              )}
            </h3>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        {!matches && !error && (
          <div className="matches-skeleton-wrap">
            <div className="skeleton" style={{ height: 60, marginBottom: 10, borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 60, marginBottom: 10, borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 60, borderRadius: 12 }} />
          </div>
        )}

        {matches && filteredMatches.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-graphic">♠ ♦</div>
            <strong>No matches found</strong>
            <p>
              {searchQuery
                ? `No results matching "${searchQuery}". Try a different search term or clear the filter.`
                : "No matches recorded in this category yet."}
            </p>
            {(searchQuery || status) && (
              <button
                type="button"
                className="secondary-button"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setSearchQuery("");
                  setStatus("");
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {matches && filteredMatches.length > 0 && (
          <div className="recent-matches-list">
            {filteredMatches.map((m) => (
              <MatchRow key={m.id} match={m} game={activeGame} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

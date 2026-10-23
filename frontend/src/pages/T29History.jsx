import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";
import { formatDate, formatTime } from "../utils/ist";

const EMPTY = { player: "", team: "", winner_team: "", status: "", reason: "", date_from: "", date_to: "" };
const STATUS = { setup: "Setup", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" };
const REASON = { auto: "Automatic", manual: "Manual end", cancelled: "Cancelled" };

export default function T29History() {
  const [filters, setFilters] = useState(EMPTY);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  function load(f) {
    const query = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => v.trim() && query.set(k, v.trim()));
    setRows(null);
    setError("");
    api.t29.history(query.toString() ? `?${query}` : "").then(setRows).catch((e) => setError(e.message));
  }

  useEffect(() => load(EMPTY), []);

  const set = (key) => (e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <>
      <PageHeader eyebrow="29 GAME" title="Match history" />

      <form
        className="panel filter-panel"
        onSubmit={(e) => { e.preventDefault(); load(filters); }}
      >
        <div className="field"><label>Player</label><input value={filters.player} onChange={set("player")} placeholder="Atrij" /></div>
        <div className="field"><label>Team (2 names)</label><input value={filters.team} onChange={set("team")} placeholder="Atrij, Kiron" /></div>
        <div className="field"><label>Winning team</label><input value={filters.winner_team} onChange={set("winner_team")} placeholder="Ankit, Tiyas" /></div>
        <div className="field">
          <label>Status</label>
          <select className="player-select" value={filters.status} onChange={set("status")}>
            <option value="">Any</option><option value="in_progress">In progress</option>
            <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="field">
          <label>Ending reason</label>
          <select className="player-select" value={filters.reason} onChange={set("reason")}>
            <option value="">Any</option><option value="auto">Automatic</option>
            <option value="manual">Manual end</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="field"><label>From (IST)</label><input type="date" value={filters.date_from} onChange={set("date_from")} /></div>
        <div className="field"><label>To (IST)</label><input type="date" value={filters.date_to} onChange={set("date_to")} /></div>
        <div className="filter-actions">
          <button className="primary-button" type="submit">Apply</button>
          <button className="secondary-button" type="button" onClick={() => { setFilters(EMPTY); load(EMPTY); }}>Reset</button>
        </div>
      </form>

      {error && <p className="error-text">{error}</p>}
      {!rows && !error && <div className="skeleton tall" />}
      {rows && rows.length === 0 && <p className="muted-note">No matches found.</p>}

      {rows && rows.length > 0 && (
        <div className="score-wrap">
          <table className="score-table lb-table">
            <thead>
              <tr>
                <th>Date (IST)</th>
                <th className="left">Room & Creator</th>
                <th className="left">Home</th>
                <th className="left">Away</th>
                <th>Score</th>
                <th className="left">Winner</th>
                <th>Status</th>
                <th>Ending</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const targetUrl = m.status === "setup" ? `/games/29/${m.id}/setup` : `/games/29/${m.id}`;
                return (
                  <tr key={m.id}>
                    <td>
                      <Link to={targetUrl} style={{ textDecoration: "underline", color: "var(--purple)" }}>
                        <strong>{formatDate(m.created_at)}</strong>
                      </Link>
                      <br /><small className="muted-note">{formatTime(m.created_at)}</small>
                    </td>
                    <td className="left">
                      <strong>{m.room_name}</strong>
                      <br /><small className="muted-note">by {m.created_by}</small>
                    </td>
                    <td className="left">{m.home.label || <span className="muted-note">Pending setup</span>}</td>
                    <td className="left">{m.away.label || <span className="muted-note">Pending setup</span>}</td>
                    <td><strong style={{ fontSize: 15 }}>{m.home.score} – {m.away.score}</strong></td>
                    <td className="left">
                      {m.status === "completed" ? (m.winner_side === "draw" ? "Draw" : m.result_label) : "—"}
                    </td>
                    <td>
                      <Link to={targetUrl}>
                        <span className={`status-badge t29-${m.status}`}>{STATUS[m.status]}</span>
                      </Link>
                    </td>
                    <td>{m.end_reason ? REASON[m.end_reason] : "—"}</td>
                    <td>
                      <Link
                        to={targetUrl}
                        className={m.status === "in_progress" || m.status === "setup" ? "primary-button" : "secondary-button"}
                        style={{ padding: "6px 14px", fontSize: 12, whiteSpace: "nowrap" }}
                      >
                        {m.status === "setup"
                          ? "Setup teams →"
                          : m.status === "in_progress"
                            ? "Resume match →"
                            : "View match"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

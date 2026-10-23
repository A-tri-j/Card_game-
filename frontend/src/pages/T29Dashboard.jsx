import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";
import { rateText } from "../utils/t29";

function Card({ label, value, note }) {
  return (
    <article className="stat-card">
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function StatsTable({ rows, nameLabel }) {
  if (rows.length === 0) {
    return (
      <section className="panel placeholder-panel" style={{ marginTop: 14 }}>
        <h2>No completed matches yet</h2>
        <p>Rankings for {nameLabel.toLowerCase()}s will appear here once 29 matches finish.</p>
      </section>
    );
  }
  return (
    <div className="score-wrap">
      <table className="score-table lb-table">
        <thead>
          <tr>
            <th className="left">{nameLabel}</th><th>Matches</th><th>Wins</th><th>Losses</th><th>Draws</th><th>Win rate</th>
            <th>Sets W/L</th><th>Calls ✓/✗</th><th>Double</th><th>Redouble</th><th>Single hand</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="left"><strong>{r.name}</strong></td>
              <td>{r.matches}</td><td>{r.wins}</td><td>{r.losses}</td><td>{r.draws}</td>
              <td>{rateText(r.win_rate)}</td>
              <td>{r.sets_won}/{r.sets_lost}</td>
              <td>{r.calls_successful}/{r.calls_failed}</td>
              <td>{r.doubled_successful}/{r.doubled_calls}</td>
              <td>{r.redoubled_successful}/{r.redoubled_calls}</td>
              <td>{r.single_hand_successful}/{r.single_hand_calls}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function T29Dashboard() {
  const [data, setData] = useState(null);
  const [activeMatches, setActiveMatches] = useState([]);
  const [tab, setTab] = useState("players");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.t29.dashboard(),
      api.t29.players(),
      api.t29.teams(),
      api.t29.headToHead(),
      api.t29.history("?status=in_progress&limit=5"),
    ])
      .then(([summary, players, teams, h2h, ongoing]) => {
        setData({ summary, players, teams, h2h });
        setActiveMatches(ongoing || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  const s = data?.summary;
  const best = (b) => (b ? `${b.name}` : "—");
  const bestNote = (b) => (b ? `${rateText(b.win_rate)} · ${b.wins}/${b.matches} matches` : "Needs a decided match");

  return (
    <>
      <PageHeader eyebrow="29 GAME" title="29 Dashboard">
        <div className="header-actions">
          <Link className="secondary-button" to="/games/29/history">Match history</Link>
          <Link className="primary-button" to="/games/29/new">New match</Link>
        </div>
      </PageHeader>

      {error && <p className="error-text">{error}</p>}
      {!data && !error && <div className="skeleton tall" />}

      {data && (
        <>
          <section className="stat-grid t29-cards">
            <Card label="Total matches" value={s.total_matches} note={`${s.in_progress_matches} in progress`} />
            <Card label="Completed" value={s.completed_matches} note={`incl. ${s.drawn_matches} draws and manual ends`} />
            <Card label="Cancelled" value={s.cancelled_matches} note="Not counted in win rates" />
            <Card label="Sets played" value={s.total_sets} note="All completed sets" />
            <Card label="Player wins" value={s.total_player_wins} note="One per player per won match" />
            <Card label="Best player" value={best(s.best_player)} note={bestNote(s.best_player)} />
            <Card label="Best team" value={best(s.best_team)} note={bestNote(s.best_team)} />
          </section>

          {activeMatches.length > 0 && (
            <article className="panel" style={{ marginTop: 8, marginBottom: 18, border: "1px solid #4a3d6b", background: "linear-gradient(150deg, #18152e, #10121f)" }}>
              <div className="panel-heading" style={{ marginBottom: 12 }}>
                <div>
                  <span className="eyebrow" style={{ color: "#a78bfa" }}>LIVE NOW</span>
                  <h3 style={{ margin: "2px 0 0" }}>Ongoing matches ({activeMatches.length})</h3>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {activeMatches.map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#0c0e18", borderRadius: 10, border: "1px solid var(--border)", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <strong style={{ fontSize: 15, color: "#fff" }}>{m.room_name}</strong>
                      <span className="muted-note" style={{ marginLeft: 10 }}>#{m.id} · by {m.created_by}</span>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        <span style={{ color: "#93c5fd", fontWeight: 600 }}>{m.home.label || "Pending setup"} ({m.home.score})</span>
                        <span style={{ margin: "0 8px", color: "var(--muted)" }}>vs</span>
                        <span style={{ color: "#fda4af", fontWeight: 600 }}>{m.away.label || "Pending setup"} ({m.away.score})</span>
                      </div>
                    </div>
                    <Link to={`/games/29/${m.id}`} className="primary-button" style={{ padding: "8px 18px", fontSize: 13 }}>
                      Resume Match →
                    </Link>
                  </div>
                ))}
              </div>
            </article>
          )}

          <div className="filter-bar" style={{ marginTop: 22 }}>
            {[["players", "Players"], ["teams", "Teams"], ["h2h", "Head-to-head"]].map(([key, text]) => (
              <button key={key} className={`chip ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>{text}</button>
            ))}
          </div>

          {tab === "players" && <StatsTable rows={data.players} nameLabel="Player" />}
          {tab === "teams" && <StatsTable rows={data.teams} nameLabel="Team" />}
          {tab === "h2h" &&
            (data.h2h.length === 0 ? (
              <section className="panel placeholder-panel" style={{ marginTop: 14 }}>
                <h2>No head-to-head records yet</h2>
                <p>Head-to-head records between team pairs will appear here once 29 matches finish.</p>
              </section>
            ) : (
              <div className="score-wrap">
                <table className="score-table lb-table">
                  <thead>
                    <tr><th className="left">Team A</th><th className="left">Team B</th><th>Matches</th><th>A wins</th><th>B wins</th><th>Draws</th><th>A win %</th><th>B win %</th></tr>
                  </thead>
                  <tbody>
                    {data.h2h.map((r) => (
                      <tr key={`${r.team_a}|${r.team_b}`}>
                        <td className="left"><strong>{r.team_a}</strong></td>
                        <td className="left"><strong>{r.team_b}</strong></td>
                        <td>{r.matches}</td><td>{r.team_a_wins}</td><td>{r.team_b_wins}</td><td>{r.draws}</td>
                        <td>{rateText(r.team_a_win_rate)}</td><td>{rateText(r.team_b_win_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          <div className="rule-note">
            <strong>Rule note:</strong> Win rate = Wins ÷ (Wins + Losses) × 100. Draws are shown separately and left out of the rate; cancelled matches are excluded everywhere. Calls ✓/✗ = successful/failed calls. Double and Redouble show successful/total.
          </div>
        </>
      )}
    </>
  );
}

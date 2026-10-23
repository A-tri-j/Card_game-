import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  Gamepad2,
  History,
  Layers,
  Plus,
  Radio,
  Trophy,
  Users,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";
import { rateText } from "../utils/t29";

function T29KpiCard({ icon: Icon, badgeColor, label, value, note, highlight = false }) {
  return (
    <article className={`kpi-card t29-kpi-card ${highlight ? "highlight-gold" : ""}`}>
      <div className="kpi-top">
        <span className={`kpi-icon-badge ${badgeColor}`}>
          <Icon size={18} />
        </span>
      </div>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value ?? "—"}</strong>
      <small className="kpi-sub">{note}</small>
    </article>
  );
}

function StatsTable({ rows, nameLabel }) {
  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-graphic">♠ ♦</div>
        <strong>No completed matches yet</strong>
        <p>Rankings for {nameLabel.toLowerCase()}s will appear here once 29 matches finish.</p>
      </div>
    );
  }
  return (
    <div className="score-wrap">
      <table className="score-table lb-table">
        <thead>
          <tr>
            <th className="left">{nameLabel}</th>
            <th>Matches</th>
            <th>Wins</th>
            <th>Losses</th>
            <th>Draws</th>
            <th>Win rate</th>
            <th>Sets W/L</th>
            <th>Calls ✓/✗</th>
            <th>Double</th>
            <th>Redouble</th>
            <th>Single hand</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name}>
              <td className="left">
                <div className="table-player-cell">
                  <span className="rank-num">#{i + 1}</span>
                  <strong>{r.name}</strong>
                </div>
              </td>
              <td>{r.matches}</td>
              <td><span className="pos-badge pos-1">{r.wins}</span></td>
              <td>{r.losses}</td>
              <td>{r.draws}</td>
              <td>
                <span className={`win-rate-pill ${parseFloat(r.win_rate) >= 50 ? "high" : ""}`}>
                  {rateText(r.win_rate)}
                </span>
              </td>
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

  const s = data?.summary || {};
  const best = (b) => (b ? `${b.name}` : "—");
  const bestNote = (b) =>
    b ? `${rateText(b.win_rate)} · ${b.wins}/${b.matches} matches` : "Needs a decided match";

  return (
    <div className="t29-dashboard-wrap">
      {/* Page Header */}
      <div className="page-header-row">
        <PageHeader eyebrow="29 GAME HUB" title="29 Dashboard" />
        <div className="header-actions-luxury">
          <Link to="/games/29/history" className="secondary-button-pill">
            <History size={14} /> History
          </Link>
          <Link to="/games/29/new" className="action-button-purple">
            <Plus size={15} /> New match
          </Link>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!data && !error && <div className="skeleton tall" />}

      {data && (
        <>
          {/* KPI Metrics Grid */}
          <section className="t29-kpi-grid">
            <T29KpiCard
              icon={Gamepad2}
              badgeColor="purple"
              label="TOTAL MATCHES"
              value={s?.total_matches ?? 0}
              note={`${s?.in_progress_matches ?? 0} in progress`}
            />
            <T29KpiCard
              icon={CheckCircle2}
              badgeColor="green"
              label="COMPLETED"
              value={s?.completed_matches ?? 0}
              note={`incl. ${s?.drawn_matches ?? 0} draws`}
            />
            <T29KpiCard
              icon={Ban}
              badgeColor="red"
              label="CANCELLED"
              value={s?.cancelled_matches ?? 0}
              note="Excluded from rates"
            />
            <T29KpiCard
              icon={Layers}
              badgeColor="blue"
              label="SETS PLAYED"
              value={s?.total_sets ?? 0}
              note="All completed sets"
            />
            <T29KpiCard
              icon={Award}
              badgeColor="purple"
              label="PLAYER WINS"
              value={s?.total_player_wins ?? 0}
              note="Total player victories"
            />
            <T29KpiCard
              icon={Crown}
              badgeColor="gold"
              label="BEST PLAYER"
              value={best(s?.best_player)}
              note={bestNote(s?.best_player)}
              highlight={Boolean(s?.best_player)}
            />
            <T29KpiCard
              icon={Users}
              badgeColor="gold"
              label="BEST TEAM"
              value={best(s?.best_team)}
              note={bestNote(s?.best_team)}
              highlight={Boolean(s?.best_team)}
            />
          </section>

          {/* Ongoing Live Matches Banner */}
          {activeMatches.length > 0 && (
            <section className="content-card t29-live-banner">
              <div className="card-header">
                <div>
                  <span className="eyebrow-badge live-badge">
                    <Radio size={13} className="eyebrow-icon pulse-icon" />
                    LIVE NOW
                  </span>
                  <h3 className="card-title">Ongoing matches ({activeMatches.length})</h3>
                </div>
              </div>

              <div className="t29-live-matches-list">
                {activeMatches.map((m) => (
                  <div key={m.id} className="t29-live-match-row">
                    <div className="live-match-info">
                      <div className="live-match-title-row">
                        <span className="match-id">#{m.id}</span>
                        <strong className="room-name">{m.room_name}</strong>
                        <span className="creator-tag">by {m.created_by}</span>
                      </div>
                      <div className="live-match-scores-row">
                        <span className="team-score-tag home">
                          {m.home.label || "Team Home"} <strong>({m.home.score})</strong>
                        </span>
                        <span className="vs-divider">vs</span>
                        <span className="team-score-tag away">
                          {m.away.label || "Team Away"} <strong>({m.away.score})</strong>
                        </span>
                      </div>
                    </div>
                    <Link to={`/games/29/${m.id}`} className="resume-match-pill-btn">
                      Resume Match <ChevronRight size={15} />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Leaderboard & Stats Table Card */}
          <section className="content-card t29-stats-panel">
            <div className="card-header">
              <div>
                <span className="eyebrow-badge">
                  <Trophy size={13} className="eyebrow-icon" />
                  LEADERBOARD & RECORDS
                </span>
                <h3 className="card-title">Statistics</h3>
              </div>

              {/* Luxury Tabs */}
              <div className="filter-chips-row" role="tablist">
                {[
                  ["players", "Players"],
                  ["teams", "Teams"],
                  ["h2h", "Head-to-head"],
                ].map(([key, text]) => (
                  <button
                    key={key}
                    type="button"
                    className={`filter-pill-chip ${tab === key ? "active" : ""}`}
                    onClick={() => setTab(key)}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>

            {tab === "players" && <StatsTable rows={data?.players || []} nameLabel="Player" />}
            {tab === "teams" && <StatsTable rows={data?.teams || []} nameLabel="Team" />}
            {tab === "h2h" &&
              ((data?.h2h || []).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-graphic">♠ ♦</div>
                  <strong>No head-to-head records yet</strong>
                  <p>Head-to-head records between team pairs will appear here once 29 matches finish.</p>
                </div>
              ) : (
                <div className="score-wrap">
                  <table className="score-table lb-table">
                    <thead>
                      <tr>
                        <th className="left">Team A</th>
                        <th className="left">Team B</th>
                        <th>Matches</th>
                        <th>A wins</th>
                        <th>B wins</th>
                        <th>Draws</th>
                        <th>A win %</th>
                        <th>B win %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.h2h.map((r) => (
                        <tr key={`${r.team_a}|${r.team_b}`}>
                          <td className="left"><strong>{r.team_a}</strong></td>
                          <td className="left"><strong>{r.team_b}</strong></td>
                          <td>{r.matches}</td>
                          <td><span className="pos-badge pos-1">{r.team_a_wins}</span></td>
                          <td><span className="pos-badge pos-1">{r.team_b_wins}</span></td>
                          <td>{r.draws}</td>
                          <td>
                            <span className={`win-rate-pill ${parseFloat(r.team_a_win_rate) >= 50 ? "high" : ""}`}>
                              {rateText(r.team_a_win_rate)}
                            </span>
                          </td>
                          <td>
                            <span className={`win-rate-pill ${parseFloat(r.team_b_win_rate) >= 50 ? "high" : ""}`}>
                              {rateText(r.team_b_win_rate)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </section>

          {/* Rule note callout */}
          <div className="rule-note">
            <strong>Rule note:</strong> Win rate = Wins ÷ (Wins + Losses) × 100. Draws are shown separately and left out of the rate; cancelled matches are excluded everywhere. Calls ✓/✗ = successful/failed calls. Double and Redouble show successful/total.
          </div>
        </>
      )}
    </div>
  );
}

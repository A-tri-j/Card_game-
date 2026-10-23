import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";
import { getToken, saveToken } from "../utils/tokens";
import { formatDateTime, formatDuration } from "../utils/ist";
import { modeLabel, multiplier, previewSet, signed, tokenKey } from "../utils/t29";

const STATUS = { setup: "Setup", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" };

function reasonText(m) {
  if (m.end_reason === "auto") return `Automatic completion (a team reached +${m.rules.target_score})`;
  if (m.end_reason === "manual") return "Manual end by the creator";
  if (m.end_reason === "cancelled") return "Cancelled by the creator";
  return "—";
}

function SideCard({ side, team, winner, target }) {
  return (
    <div className={`side-card ${side} ${winner ? "winner" : ""}`}>
      <span className="eyebrow">{side === "home" ? "HOME" : "AWAY"}</span>
      <strong className="team-names">{team.label || "—"}</strong>
      <span className="big-score">{team.score}</span>
      <small>First to +{target}</small>
    </div>
  );
}

function SetHistory({ sets }) {
  if (sets.length === 0) return <p className="muted-note">No sets played yet.</p>;
  return (
    <div className="score-wrap">
      <table className="score-table">
        <thead>
          <tr>
            <th>Set</th><th>Caller</th><th>Team</th><th>Call</th><th>Mode</th>
            <th>Points won</th><th>Result</th><th>Points</th><th>Opp pts (+/-)</th><th>Set winner</th>
          </tr>
        </thead>
        <tbody>
          {sets.map((s) => (
            <tr key={s.set_number}>
              <td className="round-no">{s.set_number}</td>
              <td>{s.calling_player}</td>
              <td>{s.calling_team}</td>
              <td>{s.single_hand ? "29 (SH)" : s.call_value}</td>
              <td>{modeLabel(s)}</td>
              <td>{s.points_won ?? "—"}</td>
              <td>
                {s.status === "called" ? (
                  <span className="status-badge in_progress">Open</span>
                ) : s.success ? (
                  <span className="score-pill pos">Success</span>
                ) : (
                  <span className="score-pill neg">Failed</span>
                )}
              </td>
              <td>{signed(s.points_awarded)}</td>
              <td>{s.opponent_points ?? "—"} ({signed(s.opponent_points_awarded)})</td>
              <td>{s.winner_side ? s.winner_side.toUpperCase() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function T29Match() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      saveToken(tokenKey(id), urlToken);
      return urlToken;
    }
    return getToken(tokenKey(id)) || "";
  });

  const lock = useRef(false);

  const [match, setMatch] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState(null);
  const [tokenNotice, setTokenNotice] = useState("");

  const [callerId, setCallerId] = useState("");
  const [callValue, setCallValue] = useState("");
  const [doubled, setDoubled] = useState(false);
  const [redoubled, setRedoubled] = useState(false);
  const [singleHand, setSingleHand] = useState(false);
  const [points, setPoints] = useState("");
  const [manualToken, setManualToken] = useState("");

  // Sync token from URL param if query string changes
  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken && urlToken !== token) {
      saveToken(tokenKey(id), urlToken);
      setToken(urlToken);
      setTokenNotice("");
      showToast("Edit token applied from link!");
    }
  }, [searchParams, id]);

  function showToast(message, type = "ok") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function applyMatch(m) {
    setMatch(m);
    setDoubled(m.current_set?.doubled ?? false);
    setRedoubled(m.current_set?.redoubled ?? false);
    setSingleHand(m.current_set?.single_hand ?? false);
    setPoints("");
  }

  useEffect(() => {
    api.t29.get(id).then(applyMatch).catch((e) => setError(e.message));
  }, [id]);

  // Visitors without the edit token see live updates.
  useEffect(() => {
    if (token || !match || match.status !== "in_progress") return;
    const timer = setInterval(() => api.t29.get(id).then(setMatch).catch(() => {}), 8000);
    return () => clearInterval(timer);
  }, [token, match?.status, id]);

  async function act(name, fn, okText) {
    if (lock.current) return; // blocks double clicks before React re-renders
    lock.current = true;
    setBusy(name);
    try {
      applyMatch(await fn());
      setCallValue("");
      setTokenNotice("");
      showToast(okText);
    } catch (e) {
      const msg = e.message || "Request failed";
      if (
        msg.toLowerCase().includes("token") ||
        msg.toLowerCase().includes("forbidden") ||
        msg.includes("403")
      ) {
        saveToken(tokenKey(id), "");
        setToken("");
        setTokenNotice("The server rejected your edit token (403 Forbidden). Enter the valid edit token below to continue.");
        showToast("Invalid or missing edit token (403 Forbidden)", "error");
      } else {
        showToast(msg, "error");
      }
    } finally {
      lock.current = false;
      setBusy("");
    }
  }

  if (error)
    return (
      <section className="panel placeholder-panel">
        <h2>Match not found</h2>
        <p>{error}</p>
        <Link className="secondary-button" to="/games/29">29 dashboard</Link>
      </section>
    );
  if (!match) return <div className="skeleton tall" />;
  if (match.status === "setup" && token) return <Navigate to={`/games/29/${id}/setup`} replace />;

  const owner = Boolean(token);
  const live = match.status === "in_progress";
  const finished = match.status === "completed" || match.status === "cancelled";
  const openSet = match.current_set;
  const mult = multiplier(doubled, redoubled, singleHand);
  const preview =
    openSet && points !== ""
      ? previewSet(openSet.call_value, Number(points), doubled, redoubled, singleHand)
      : null;
  const opposingTeam = openSet ? (openSet.calling_side === "home" ? match.away.label : match.home.label) : "";
  const allPlayers = [
    ...match.home.players.map((p) => ({ ...p, side: "Home" })),
    ...match.away.players.map((p) => ({ ...p, side: "Away" })),
  ];

  const submitCall = () => {
    const value = Number(callValue);
    if (!callerId) return showToast("Choose the calling player", "error");
    if (!Number.isInteger(value) || value < match.rules.call_min || value > match.rules.call_max)
      return showToast(`Call must be ${match.rules.call_min}–${match.rules.call_max}`, "error");
    act("call", () => api.t29.recordCall(id, { calling_player_id: Number(callerId), call_value: value }, token), `Set ${match.next_set_number} started`);
  };

  const submitResult = () => {
    const value = Number(points);
    if (points === "" || !Number.isInteger(value) || value < 0 || value > 29)
      return showToast("Points won must be a whole number from 0 to 29", "error");
    act("result", () => api.t29.submitResult(id, openSet.set_number, { points_won: value, doubled, redoubled, single_hand: singleHand }, token), "Set result saved");
  };

  const endGame = () => {
    if (window.confirm("End the game now? The higher score wins (equal scores = draw).")) act("end", () => api.t29.end(id, token), "Match ended");
  };
  const cancelGame = () => {
    if (window.confirm("Cancel this match? It will not count in win/loss statistics.")) act("cancel", () => api.t29.cancel(id, token), "Match cancelled");
  };

  return (
    <>
      <PageHeader eyebrow={`29 GAME · MATCH #${match.id}`} title={match.room_name}>
        <span className={`status-badge t29-${match.status}`}>{STATUS[match.status]}</span>
      </PageHeader>

      <p className="muted-note" style={{ marginBottom: 14 }}>
        Created by {match.created_by} · {formatDateTime(match.created_at)} ·{" "}
        {owner ? (
          <span>
            <strong style={{ color: "var(--accent)" }}>✓ You have edit access</strong>{" "}
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "#8a99ad",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: 12,
                padding: "0 4px",
              }}
              onClick={() => {
                saveToken(tokenKey(id), "");
                setToken("");
                setTokenNotice("");
                showToast("Edit access removed. You can enter a new token below.");
              }}
            >
              (Change / Clear token)
            </button>
          </span>
        ) : (
          "Read only (no edit token in this browser)"
        )}
        {live && ` · Set ${openSet ? openSet.set_number : match.next_set_number}`}
      </p>

      <section className="board">
        <SideCard side="home" team={match.home} winner={match.winner_side === "home"} target={match.rules.target_score} />
        <div className="vs">VS</div>
        <SideCard side="away" team={match.away} winner={match.winner_side === "away"} target={match.rules.target_score} />
      </section>

      {tokenNotice && (
        <div
          className="panel"
          style={{
            marginTop: 14,
            background: "#2a151b",
            border: "1px solid #7a2b38",
            color: "#ffb4bc",
            padding: "12px 16px",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <strong>⚠️ Access Denied:</strong> {tokenNotice}
        </div>
      )}

      {!owner && (live || match.status === "setup") && (
        <div className="panel" style={{ marginTop: 14, background: "#151829", border: "1px dashed #403b60", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <strong style={{ fontSize: 13, color: "#d8c9ff" }}>Have the edit token for this room?</strong>
            <p className="muted-note" style={{ margin: "2px 0 0" }}>Enter your private edit token to unlock scoring and management controls.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="password"
              placeholder="Paste edit token"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              style={{ padding: "8px 12px", background: "#0c0e16", border: "1px solid var(--border)", borderRadius: 8, color: "#fff", fontSize: 12, minWidth: 220 }}
            />
            <button
              className="primary-button"
              style={{ padding: "8px 16px", fontSize: 12 }}
              onClick={() => {
                const val = manualToken.trim();
                if (!val) return showToast("Enter your edit token", "error");
                saveToken(tokenKey(id), val);
                setToken(val);
                setTokenNotice("");
                setManualToken("");
                showToast("Edit token applied!");
              }}
            >
              Unlock access
            </button>
          </div>
        </div>
      )}

      {match.status === "setup" && (
        <article className="panel" style={{ marginTop: 16, textAlign: "center", padding: "32px 20px" }}>
          <span className="eyebrow">SETUP REQUIRED</span>
          <h2 style={{ margin: "8px 0 10px", font: "600 22px var(--heading)" }}>Teams not configured yet</h2>
          <p className="muted-note" style={{ maxWidth: 460, margin: "0 auto 18px" }}>
            This match is currently in the setup stage. Assign players to Home and Away teams before scoring can begin.
          </p>
          <Link to={`/games/29/${id}/setup`} className="primary-button">
            Configure Teams & Start Game →
          </Link>
        </article>
      )}

      {finished && (
        <article className="panel result-panel">
          <span className="eyebrow">{match.status === "cancelled" ? "MATCH CANCELLED" : "FINAL RESULT"}</span>
          <h2>
            {match.status === "cancelled"
              ? "Cancelled — not counted in statistics"
              : match.winner_side === "draw"
                ? "Draw"
                : `${match.result_label} won`}
          </h2>
          <div className="result-grid">
            <div><small>Final score</small><strong>{match.home.score} – {match.away.score}</strong></div>
            <div><small>Sets played</small><strong>{match.total_sets}</strong></div>
            <div><small>Ending</small><strong>{reasonText(match)}</strong></div>
            <div><small>Duration</small><strong>{formatDuration(match.duration_seconds)}</strong></div>
            <div><small>Started</small><strong>{formatDateTime(match.started_at)}</strong></div>
            <div><small>Ended</small><strong>{formatDateTime(match.completed_at || match.cancelled_at)}</strong></div>
          </div>
        </article>
      )}

      {live && owner && (
        <article className="panel" style={{ marginTop: 16 }}>
          {!openSet ? (
            <>
              <div className="panel-heading"><div><span className="eyebrow">NEW SET</span><h3>Set {match.next_set_number} — record the call</h3></div></div>
              <div className="form-row">
                <div className="field">
                  <label>Calling player</label>
                  <select className="player-select" value={callerId} onChange={(e) => setCallerId(e.target.value)}>
                    <option value="">Choose player</option>
                    {allPlayers.map((p) => (
                      <option key={p.player_id} value={p.player_id}>{p.name} ({p.side})</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Call ({match.rules.call_min}–{match.rules.call_max})</label>
                  <input type="number" min={match.rules.call_min} max={match.rules.call_max} value={callValue} onChange={(e) => setCallValue(e.target.value)} />
                </div>
              </div>
              <button className="primary-button" disabled={busy !== ""} onClick={submitCall}>
                {busy === "call" ? "Saving..." : "Start set"}
              </button>
            </>
          ) : (
            <>
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">SET {openSet.set_number} IN PLAY</span>
                  <h3>{openSet.calling_player} ({openSet.calling_team}) called {singleHand ? "Single Hand (29)" : openSet.call_value}</h3>
                </div>
              </div>

              <div className="toggle-row">
                <div className="toggle">
                  <span>Single Hand</span>
                  <button type="button" role="switch" aria-checked={singleHand}
                    className={`switch ${singleHand ? "on" : ""}`}
                    onClick={() => { setSingleHand(!singleHand); setDoubled(false); setRedoubled(false); }}>
                    {singleHand ? "ON" : "OFF"}
                  </button>
                </div>
                <div className="toggle">
                  <span>Double</span>
                  <button type="button" role="switch" aria-checked={doubled} disabled={singleHand}
                    className={`switch ${doubled ? "on" : ""}`}
                    onClick={() => { setDoubled(!doubled); if (doubled) setRedoubled(false); }}>
                    {doubled ? "ON" : "OFF"}
                  </button>
                </div>
                <div className="toggle">
                  <span>Redouble</span>
                  <button type="button" role="switch" aria-checked={redoubled} disabled={!doubled || singleHand}
                    className={`switch ${redoubled ? "on" : ""}`} onClick={() => setRedoubled(!redoubled)}>
                    {redoubled ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              <div className="field" style={{ maxWidth: 260 }}>
                <label>Points won by {openSet.calling_team} (0–29)</label>
                <input type="number" min="0" max="29" value={points} onChange={(e) => setPoints(e.target.value)} />
              </div>
              <p className="muted-note" style={{ margin: "10px 0 14px" }}>
                {preview ? (
                  <>
                    {opposingTeam} tulbe <b>{preview.opponentPoints}</b> ·{" "}
                    {openSet.calling_team}: <b>{signed(preview.caller)}</b> ·{" "}
                    {opposingTeam}: <b>{signed(preview.opponent)}</b>
                  </>
                ) : (
                  <>Caller team-er point dao. Opponent = 29 − caller. Ekhon multiplier: ×{mult}</>
                )}
              </p>
              <button className="primary-button" disabled={busy !== ""} onClick={submitResult}>
                {busy === "result" ? "Saving..." : "Submit result"}
              </button>
            </>
          )}

          <div className="action-bar">
            <button className="secondary-button" disabled={busy !== ""} onClick={endGame}>End game</button>
            <button className="danger-button" disabled={busy !== ""} onClick={cancelGame}>Cancel match</button>
          </div>
        </article>
      )}

      <h3 className="section-title">Set history</h3>
      <SetHistory sets={match.sets} />

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </>
  );
}

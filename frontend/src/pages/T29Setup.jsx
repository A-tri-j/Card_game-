import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import PlayerField from "../components/PlayerField";
import { api } from "../services/api";
import { getToken, saveToken } from "../utils/tokens";
import { tokenKey } from "../utils/t29";

const DEFAULT_ROWS = [
  { name: "", side: "home" },
  { name: "", side: "home" },
  { name: "", side: "away" },
  { name: "", side: "away" },
];

export default function T29Setup() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      saveToken(tokenKey(id), urlToken);
      return urlToken;
    }
    return getToken(tokenKey(id)) || "";
  });

  const [match, setMatch] = useState(null);
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [manualToken, setManualToken] = useState("");

  // Sync token from URL param if query string changes
  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken && urlToken !== token) {
      saveToken(tokenKey(id), urlToken);
      setToken(urlToken);
      setError("");
    }
  }, [searchParams, id]);

  useEffect(() => {
    api.t29
      .get(id)
      .then((m) => {
        if (m.status !== "setup") return navigate(`/games/29/${id}`, { replace: true });
        setMatch(m);
        if (m.roster.length === 4) setRows(m.roster.map((r) => ({ name: r.name, side: r.side })));
      })
      .catch((e) => setError(e.message));
  }, [id, navigate]);

  const update = (i, patch) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const names = rows.map((r) => r.name.trim());
  const home = rows.filter((r) => r.side === "home" && r.name.trim()).map((r) => r.name.trim());
  const away = rows.filter((r) => r.side === "away" && r.name.trim()).map((r) => r.name.trim());
  const homeCount = rows.filter((r) => r.side === "home").length;
  const awayCount = rows.filter((r) => r.side === "away").length;

  let problem = "";
  if (names.some((n) => !n)) problem = "Enter all 4 player names.";
  else if (new Set(names.map((n) => n.toLowerCase())).size !== 4) problem = "All 4 names must be different.";
  else if (homeCount !== 2 || awayCount !== 2)
    problem = `Each team needs exactly 2 players (Home: ${homeCount}, Away: ${awayCount}).`;

  async function startGame() {
    if (busy || problem) return;
    setBusy(true);
    setError("");
    try {
      await api.t29.setPlayers(id, rows.map((r) => ({ name: r.name.trim(), side: r.side })), token);
      await api.t29.start(id, token);
      navigate(`/games/29/${id}`);
    } catch (e) {
      const msg = e.message || "Failed to start match";
      if (msg.toLowerCase().includes("token") || msg.toLowerCase().includes("forbidden") || msg.includes("403")) {
        saveToken(tokenKey(id), "");
        setToken("");
        setError("Invalid edit token (403 Forbidden). Please enter the valid edit token below.");
      } else {
        setError(msg);
      }
      setBusy(false);
    }
  }

  if (error && !match)
    return (
      <section className="panel placeholder-panel">
        <h2>Match not found</h2>
        <p>{error}</p>
        <Link className="secondary-button" to="/games/29">29 dashboard</Link>
      </section>
    );
  if (!match) return <div className="skeleton tall" />;

  if (!token)
    return (
      <section className="panel placeholder-panel">
        <h2>Enter Edit Token</h2>
        <p>To configure teams for this match, enter the edit token given when the room was created.</p>
        {error && <p className="error-text" style={{ margin: "0 auto 12px" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", maxWidth: 360, margin: "0 auto 16px" }}>
          <input
            type="password"
            placeholder="Paste edit token"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
          />
          <button
            className="primary-button"
            onClick={() => {
              const val = manualToken.trim();
              if (!val) return setError("Please enter an edit token");
              saveToken(tokenKey(id), val);
              setToken(val);
              setError("");
              setManualToken("");
            }}
          >
            Unlock
          </button>
        </div>
        <Link className="secondary-button" to={`/games/29/${id}`}>View match (read only)</Link>
      </section>
    );

  return (
    <>
      <PageHeader eyebrow={`29 GAME · ${match.room_name}`} title="Team setup" />

      <div className="panel form-card">
        {rows.map((row, i) => (
          <div key={i} className="setup-row">
            <PlayerField label={`Player ${i + 1}`} value={row.name} onChange={(v) => update(i, { name: v })} />
            <div className="side-toggle" role="group" aria-label={`Side for player ${i + 1}`}>
              <button type="button" className={`side-btn home ${row.side === "home" ? "on" : ""}`} onClick={() => update(i, { side: "home" })}>
                Home
              </button>
              <button type="button" className={`side-btn away ${row.side === "away" ? "on" : ""}`} onClick={() => update(i, { side: "away" })}>
                Away
              </button>
            </div>
          </div>
        ))}

        <div className="team-preview">
          <div className="side-card home">
            <span className="eyebrow">HOME TEAM</span>
            <strong>{home.length ? home.join(" + ") : "—"}</strong>
          </div>
          <div className="side-card away">
            <span className="eyebrow">AWAY TEAM</span>
            <strong>{away.length ? away.join(" + ") : "—"}</strong>
          </div>
        </div>

        {(problem || error) && <p className="error-text">{error || problem}</p>}
        <button className="primary-button" disabled={busy || Boolean(problem)} onClick={startGame}>
          {busy ? "Starting..." : "Start game"}
        </button>
        <p className="muted-note" style={{ marginTop: 10 }}>Teams are locked once the game starts.</p>
      </div>
    </>
  );
}

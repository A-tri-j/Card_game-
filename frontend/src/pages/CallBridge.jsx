import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import PlayerField from "../components/PlayerField";
import MatchRow from "../components/MatchRow";
import { api } from "../services/api";
import { getCreator, saveCreator, saveToken } from "../utils/tokens";

export default function CallBridge() {
  const navigate = useNavigate();
  const [creator, setCreator] = useState(getCreator());
  const [rounds, setRounds] = useState(5);
  const [players, setPlayers] = useState(["", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState([]);

  useEffect(() => {
    api.listMatches("?status=in_progress&limit=10").then(setOpen).catch(() => {});
  }, []);

  const setPlayer = (i, value) =>
    setPlayers((prev) => prev.map((p, idx) => (idx === i ? value : p)));

  async function submit(e) {
    e.preventDefault();
    setError("");

    const names = players.map((p) => p.trim().replace(/\s+/g, " "));
    const creatorName = creator.trim();

    if (!creatorName) return setError("Please enter the match creator name.");
    if (names.some((n) => !n)) return setError("All 4 player names are required.");
    if (new Set(names.map((n) => n.toLowerCase())).size !== 4)
      return setError("All 4 player names must be unique.");

    const roundCount = Number(rounds);
    if (!Number.isInteger(roundCount) || roundCount < 1 || roundCount > 50)
      return setError("Rounds must be between 1 and 50.");

    setBusy(true);
    try {
      const match = await api.createMatch({
        created_by: creatorName,
        total_rounds: roundCount,
        players: names,
      });
      saveToken(match.id, match.edit_token);
      saveCreator(creatorName);
      navigate(`/matches/${match.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="GAME" title="Call Bridge" />

      <form className="panel form-card" onSubmit={submit}>
        <div className="panel-heading">
          <div>
            <span className="eyebrow">NEW MATCH</span>
            <h3>Create a match</h3>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>You (Match Creator)</label>
            <input
              type="text"
              value={creator}
              maxLength={100}
              placeholder="e.g. Alex"
              onChange={(e) => setCreator(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Number of rounds</label>
            <input
              type="number"
              min="1"
              max="50"
              value={rounds}
              onChange={(e) => setRounds(e.target.value)}
            />
          </div>
        </div>

        <div className="grid-4">
          {players.map((value, i) => (
            <PlayerField
              key={i}
              label={`Player ${i + 1}`}
              value={value}
              onChange={(v) => setPlayer(i, v)}
            />
          ))}
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Creating..." : "Start game"}
        </button>
      </form>

      {open.length > 0 && (
        <article className="panel" style={{ marginTop: 19 }}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">CONTINUE</span>
              <h3>Ongoing matches</h3>
            </div>
          </div>
          {open.map((m) => <MatchRow key={m.id} match={m} />)}
        </article>
      )}
    </>
  );
}

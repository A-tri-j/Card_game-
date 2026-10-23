import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";
import { getToken } from "../utils/tokens";
import { calcScore, fmt } from "../utils/scoring";

const ORD = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };

const keyOf = (round, playerId) => `${round}:${playerId}`;

function buildDraft(match) {
  const draft = {};
  match.rounds.forEach((r) =>
    r.scores.forEach((s) => {
      draft[keyOf(r.round_number, s.player_id)] = {
        call: s.call_value == null ? "" : String(s.call_value),
        tricks: s.tricks_won == null ? "" : String(s.tricks_won),
      };
    })
  );
  return draft;
}

const sameValue = (text, server) =>
  text === "" ? server == null : Number(text) === server;

export default function MatchDetails() {
  const { id } = useParams();
  const token = getToken(id);

  const [match, setMatch] = useState(null);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState(null);

  function showToast(message, type = "ok") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }

  useEffect(() => {
    let off = false;
    setLoading(true);
    api
      .getMatch(id)
      .then((m) => {
        if (off) return;
        setMatch(m);
        setDraft(buildDraft(m));
        setError("");
      })
      .catch((e) => !off && setError(e.message))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [id]);

  const canEdit = Boolean(token) && match?.status === "in_progress";

  const totals = useMemo(() => {
    const result = {};
    if (!match) return result;
    match.players.forEach((p) => (result[p.player_id] = 0));
    match.rounds.forEach((r) =>
      match.players.forEach((p) => {
        const d = draft[keyOf(r.round_number, p.player_id)];
        const score = d ? calcScore(d.call, d.tricks) : null;
        if (score !== null) result[p.player_id] += score;
      })
    );
    return result;
  }, [match, draft]);

  function isDirty(round) {
    return round.scores.some((s) => {
      const d = draft[keyOf(round.round_number, s.player_id)];
      return d && (!sameValue(d.call, s.call_value) || !sameValue(d.tricks, s.tricks_won));
    });
  }

  const dirtyCount = match ? match.rounds.filter(isDirty).length : 0;

  function setField(key, field, value) {
    setDraft((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  async function saveRound(round) {
    const scores = [];
    for (const p of match.players) {
      const d = draft[keyOf(round.round_number, p.player_id)];
      const call = d.call === "" ? null : Number(d.call);
      const tricks = d.tricks === "" ? null : Number(d.tricks);

      if (call !== null && (Number.isNaN(call) || call < 1 || call > 13))
        return showToast(`${p.name}: call must be between 1 and 13`, "error");
      if (tricks !== null && (Number.isNaN(tricks) || tricks < 0 || tricks > 13))
        return showToast(`${p.name}: tricks must be between 0 and 13`, "error");

      scores.push({ player_id: p.player_id, call_value: call, tricks_won: tricks });
    }

    setBusy(`round-${round.round_number}`);
    try {
      const updated = await api.updateRound(id, round.round_number, { scores }, token);
      const fresh = buildDraft(updated);
      setMatch(updated);
      // Replace only the saved round; keep unsaved edits in other rounds.
      setDraft((prev) => {
        const next = { ...prev };
        Object.keys(fresh).forEach((k) => {
          if (k.startsWith(`${round.round_number}:`)) next[k] = fresh[k];
        });
        return next;
      });
      showToast(`Round ${round.round_number} saved`);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy("");
    }
  }

  async function runAction(name, confirmText, call, successText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(name);
    try {
      const updated = await call(id, token);
      setMatch(updated);
      setDraft(buildDraft(updated));
      showToast(successText);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <div className="skeleton tall" />;
  if (error)
    return (
      <section className="panel placeholder-panel">
        <h2>Match not found</h2>
        <p>{error}</p>
        <Link className="secondary-button" to="/matches">Match history</Link>
      </section>
    );

  const completed = match.status === "completed";

  return (
    <>
      <PageHeader eyebrow={`CALL BRIDGE · MATCH #${match.id}`} title="Scorecard">
        <span className={`status-badge ${match.status}`}>
          {match.status === "in_progress" ? "In progress" : match.status}
        </span>
      </PageHeader>

      <p className="muted-note" style={{ marginBottom: 14 }}>
        Created by {match.created_by} ·{" "}
        {token ? "You can edit this match" : "Read only (no edit token)"}
      </p>

      <div className="score-wrap">
        <table className="score-table">
          <thead>
            <tr>
              <th>Round</th>
              {match.players.map((p) => (
                <th key={p.player_id}>
                  {p.name}
                  {completed && p.final_position && (
                    <span className={`pos-badge pos-${p.final_position}`}>
                      {ORD[p.final_position]}
                    </span>
                  )}
                </th>
              ))}
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {match.rounds.map((r) => {
              const dirty = isDirty(r);
              return (
                <tr key={r.round_number} className={dirty ? "dirty" : ""}>
                  <td className="round-no">R{r.round_number}</td>
                  {match.players.map((p) => {
                    const k = keyOf(r.round_number, p.player_id);
                    const d = draft[k] || { call: "", tricks: "" };
                    const score = calcScore(d.call, d.tricks);
                    return (
                      <td key={p.player_id}>
                        {canEdit ? (
                          <div className="cell-inputs">
                            <label>
                              <span>Call</span>
                              <input
                                className="num-input"
                                type="number"
                                inputMode="decimal"
                                step="any"
                                min="1"
                                max="13"
                                value={d.call}
                                onChange={(e) => setField(k, "call", e.target.value)}
                              />
                            </label>
                            <label>
                              <span>Tricks</span>
                              <input
                                className="num-input"
                                type="number"
                                inputMode="decimal"
                                step="any"
                                min="0"
                                max="13"
                                value={d.tricks}
                                onChange={(e) => setField(k, "tricks", e.target.value)}
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="cell-readonly">
                            {d.call || "—"} / {d.tricks || "—"}
                          </div>
                        )}
                        <span
                          className={`score-pill ${
                            score === null ? "" : score < 0 ? "neg" : "pos"
                          }`}
                        >
                          {fmt(score)}
                        </span>
                      </td>
                    );
                  })}
                  {canEdit && (
                    <td>
                      <button
                        className="ghost-button"
                        disabled={!dirty || busy !== ""}
                        onClick={() => saveRound(r)}
                      >
                        {busy === `round-${r.round_number}` ? "..." : "Save"}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th>Total</th>
              {match.players.map((p) => (
                <th key={p.player_id}>{fmt(p.final_score ?? totals[p.player_id])}</th>
              ))}
              {canEdit && <th />}
            </tr>
          </tfoot>
        </table>
      </div>

      {dirtyCount > 0 && (
        <p className="muted-note" style={{ marginTop: 10 }}>
          {dirtyCount} round(s) have unsaved changes.
        </p>
      )}

      {token && (
        <div className="action-bar">
          {match.status === "in_progress" && (
            <button
              className="primary-button"
              disabled={busy !== "" || dirtyCount > 0}
              title={dirtyCount > 0 ? "Please save all rounds first" : ""}
              onClick={() =>
                runAction(
                  "complete",
                  "Finish match? Final rankings will be calculated.",
                  api.completeMatch,
                  "Match completed"
                )
              }
            >
              Finish match
            </button>
          )}
          {completed && (
            <button
              className="secondary-button"
              disabled={busy !== ""}
              onClick={() =>
                runAction("reopen", "Reopen match for editing? Final results will be reset.", api.reopenMatch, "Match reopened")
              }
            >
              Reopen to edit
            </button>
          )}
          {match.status !== "closed" && (
            <button
              className="danger-button"
              disabled={busy !== ""}
              onClick={() =>
                runAction("close", "Close match permanently? It can no longer be edited.", api.closeMatch, "Match closed")
              }
            >
              Close match
            </button>
          )}
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </>
  );
}

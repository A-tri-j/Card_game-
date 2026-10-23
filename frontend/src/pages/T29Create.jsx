import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";
import { getCreator, saveCreator, saveToken } from "../utils/tokens";
import { tokenKey } from "../utils/t29";

export default function T29Create() {
  const navigate = useNavigate();
  const [creator, setCreator] = useState(getCreator());
  const [room, setRoom] = useState("");
  const [callMin, setCallMin] = useState(15);
  const [callMax, setCallMax] = useState(28);
  const [target, setTarget] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!creator.trim()) return setError("Enter the match creator's name.");
    if (!room.trim()) return setError("Give the match room a name.");
    if (Number(callMin) > Number(callMax)) return setError("Minimum call cannot exceed maximum call.");

    setBusy(true);
    try {
      const match = await api.t29.create({
        created_by: creator.trim(),
        room_name: room.trim(),
        call_min: Number(callMin),
        call_max: Number(callMax),
        target_score: Number(target),
      });
      saveToken(tokenKey(match.id), match.edit_token);
      saveCreator(creator.trim());
      navigate(`/games/29/${match.id}/setup`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="29 GAME" title="Create match room" />
      <form className="panel form-card" onSubmit={submit}>
        <div className="form-row">
          <div className="field">
            <label>You (match creator)</label>
            <input value={creator} maxLength={100} onChange={(e) => setCreator(e.target.value)} placeholder="e.g. Atrij" />
          </div>
          <div className="field">
            <label>Room name</label>
            <input value={room} maxLength={60} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. Friday night" />
          </div>
        </div>

        <div className="grid-3">
          <div className="field">
            <label>Lowest call</label>
            <input type="number" min="1" max="28" value={callMin} onChange={(e) => setCallMin(e.target.value)} />
          </div>
          <div className="field">
            <label>Highest call</label>
            <input type="number" min="1" max="28" value={callMax} onChange={(e) => setCallMax(e.target.value)} />
          </div>
          <div className="field">
            <label>Match ends at +</label>
            <input type="number" min="1" max="20" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Creating..." : "Create room"}
        </button>
      </form>
    </>
  );
}

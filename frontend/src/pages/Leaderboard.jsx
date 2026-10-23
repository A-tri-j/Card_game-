import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { api } from "../services/api";

export default function Leaderboard() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .leaderboard("call_bridge")
      .then((d) => setRows(d.players))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <PageHeader eyebrow="RANKINGS" title="Leaderboard" />
      <p className="muted-note" style={{ marginBottom: 14 }}>
        Call Bridge · Sorted by: 1st place count, then 2nd, 3rd, then total score
      </p>

      {error && <p className="error-text">{error}</p>}
      {!rows && !error && <div className="skeleton tall" />}
      {rows && rows.length === 0 && (
        <section className="panel placeholder-panel">
          <h2>No rankings yet</h2>
          <p>Player rankings will appear here once matches are completed or imported.</p>
        </section>
      )}

      {rows && rows.length > 0 && (
        <div className="score-wrap">
          <table className="score-table lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th className="left">Player</th>
                <th>Matches</th>
                <th>1st</th>
                <th>2nd</th>
                <th>3rd</th>
                <th>4th</th>
                <th>Loser</th>
                <th>Win %</th>
                <th>Total</th>
                <th>Avg</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.player_id}>
                  <td className="round-no">{r.rank}</td>
                  <td className="left"><strong>{r.name}</strong></td>
                  <td>{r.matches}</td>
                  <td><span className="pos-badge pos-1">{r.first}</span></td>
                  <td><span className="pos-badge pos-2">{r.second}</span></td>
                  <td><span className="pos-badge pos-3">{r.third}</span></td>
                  <td><span className="pos-badge pos-4">{r.fourth}</span></td>
                  <td>{r.loser}</td>
                  <td>{r.win_rate}%</td>
                  <td>{r.total_score}</td>
                  <td>{r.avg_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

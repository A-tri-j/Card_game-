import { Link } from "react-router-dom";
import { ChevronRight, Crown } from "lucide-react";

const STATUS = {
  in_progress: "In progress",
  completed: "Completed",
  closed: "Closed",
  setup: "Setup",
  cancelled: "Cancelled",
};

export function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MatchRow({ match, game = "call_bridge" }) {
  if (!match) return null;

  // 29 Match Format
  if (game === "29" || match.room_name) {
    const targetUrl =
      match.status === "setup"
        ? `/games/29/${match.id}/setup`
        : `/games/29/${match.id}`;
    const homeNames = match.home?.label || "Team Home";
    const awayNames = match.away?.label || "Team Away";
    const winnerLabel =
      match.status === "completed"
        ? match.winner_side === "draw"
          ? "Draw"
          : match.result_label
        : null;

    return (
      <Link className="match-row" to={targetUrl}>
        <span className="match-id">#{match.id}</span>
        <span className="match-main">
          <strong className="match-players-title">
            {homeNames} vs {awayNames}
          </strong>
          <span className="match-meta-line">
            <span className="match-date">{formatDate(match.created_at)}</span>
            <span className="match-meta-bullet">·</span>
            <span className="match-score-summary">
              Score: {match.home?.score ?? 0} – {match.away?.score ?? 0}
            </span>
            {winnerLabel && (
              <>
                <span className="match-meta-bullet">·</span>
                <span className="match-champion-pill">
                  <Crown size={12} className="crown-icon" />
                  Winner: {winnerLabel}
                </span>
              </>
            )}
          </span>
        </span>
        <span className={`status-badge ${match.status}`}>
          {STATUS[match.status] || match.status}
        </span>
        <ChevronRight size={17} className="row-chevron" />
      </Link>
    );
  }

  // Call Bridge Format
  const players = match.players || [];
  const isFinal = players.some((p) => p.final_position != null);
  const filled = isFinal
    ? match.total_rounds
    : (match.rounds || []).filter((r) =>
        (r.scores || []).every((s) => s.score_value !== null)
      ).length;

  const winners = players
    .filter((p) => p.final_position === 1)
    .map((p) => p.name);

  return (
    <Link className="match-row" to={`/matches/${match.id}`}>
      <span className="match-id">#{match.id}</span>
      <span className="match-main">
        <strong className="match-players-title">
          {players.map((p) => p.name).join(" · ") || "No players"}
        </strong>
        <span className="match-meta-line">
          <span className="match-date">{formatDate(match.created_at)}</span>
          <span className="match-meta-bullet">·</span>
          <span className="match-rounds-count">
            {filled}/{match.total_rounds} rounds
          </span>
          {winners.length > 0 && (
            <>
              <span className="match-meta-bullet">·</span>
              <span className="match-champion-pill">
                <Crown size={12} className="crown-icon" />
                Champion: {winners.join(", ")}
              </span>
            </>
          )}
        </span>
      </span>
      <span className={`status-badge ${match.status}`}>
        {STATUS[match.status] || match.status}
      </span>
      <ChevronRight size={17} className="row-chevron" />
    </Link>
  );
}

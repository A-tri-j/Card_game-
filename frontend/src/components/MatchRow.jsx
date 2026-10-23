import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const STATUS = {
  in_progress: "In progress",
  completed: "Completed",
  closed: "Closed",
};

export function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export default function MatchRow({ match }) {
  const isFinal = match.players.some((p) => p.final_position != null);
  const filled = isFinal
    ? match.total_rounds
    : match.rounds.filter((r) => r.scores.every((s) => s.score_value !== null)).length;

  const winners = match.players
    .filter((p) => p.final_position === 1)
    .map((p) => p.name);

  return (
    <Link className="match-row" to={`/matches/${match.id}`}>
      <span className="match-id">#{match.id}</span>
      <span className="match-main">
        <strong>{match.players.map((p) => p.name).join(" · ")}</strong>
        <small>
          {formatDate(match.created_at)} · {filled}/{match.total_rounds} rounds
          {winners.length > 0 && ` · Champion: ${winners.join(", ")}`}
        </small>
      </span>
      <span className={`status-badge ${match.status}`}>{STATUS[match.status]}</span>
      <ChevronRight size={17} />
    </Link>
  );
}

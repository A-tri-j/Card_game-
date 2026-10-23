import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import MatchRow from "../components/MatchRow";
import { api } from "../services/api";

const FILTERS = [
  { value: "", label: "All" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

export default function History() {
  const [status, setStatus] = useState("");
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setMatches(null);
    setError("");
    const query = `?limit=100${status ? `&status=${status}` : ""}`;
    api.listMatches(query).then(setMatches).catch((e) => setError(e.message));
  }, [status]);

  return (
    <>
      <PageHeader eyebrow="ARCHIVE" title="Match history" />

      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`chip ${status === f.value ? "active" : ""}`}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <article className="panel">
        {error && <p className="error-text">{error}</p>}
        {!matches && !error && <div className="skeleton" />}
        {matches && matches.length === 0 && (
          <div className="empty-state">
            <strong>No matches found</strong>
          </div>
        )}
        {matches && matches.map((m) => <MatchRow key={m.id} match={m} />)}
      </article>
    </>
  );
}

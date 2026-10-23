import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import PageHeader from "../components/PageHeader";

export default function Games() {
  return (
    <>
      <PageHeader eyebrow="PLAY YOUR WAY" title="Games" />
      <section className="game-grid">
        <Link className="game-card" to="/games/call-bridge">
          <span className="game-symbol">♠</span>
          <h3>Call Bridge</h3>
          <p>4 players, round-wise scorecard with calls and tricks.</p>
          <span className="available">Play now <ChevronRight size={14} /></span>
        </Link>

        <Link className="game-card" to="/games/29">
          <span className="game-symbol red-suit">♥</span>
          <h3>29</h3>
          <p>2 vs 2 teams, calls, Double/Redouble, sets and team statistics.</p>
          <span className="available">Play now <ChevronRight size={14} /></span>
        </Link>
      </section>
    </>
  );
}

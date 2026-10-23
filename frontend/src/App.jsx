import { Link, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Games from "./pages/Games";
import CallBridge from "./pages/CallBridge";
import MatchDetails from "./pages/MatchDetails";
import History from "./pages/History";
import Leaderboard from "./pages/Leaderboard";
import T29Dashboard from "./pages/T29Dashboard";
import T29Create from "./pages/T29Create";
import T29Setup from "./pages/T29Setup";
import T29Match from "./pages/T29Match";
import T29History from "./pages/T29History";

function NotFound() {
  return (
    <section className="panel placeholder-panel">
      <h2>Page Not Found</h2>
      <Link className="secondary-button" to="/">Go to Home</Link>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="games" element={<Games />} />
        <Route path="games/call-bridge" element={<CallBridge />} />
        <Route path="games/29" element={<T29Dashboard />} />
        <Route path="games/29/new" element={<T29Create />} />
        <Route path="games/29/history" element={<T29History />} />
        <Route path="games/29/:id/setup" element={<T29Setup />} />
        <Route path="games/29/:id" element={<T29Match />} />
        <Route path="game/29" element={<Navigate to="/games/29" replace />} />
        <Route path="29" element={<Navigate to="/games/29" replace />} />
        <Route path="matches" element={<History />} />
        <Route path="matches/:id" element={<MatchDetails />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

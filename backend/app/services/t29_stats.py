"""
All 29 statistics are calculated from saved matches. Nothing is stored as a counter.

Input: list of completed matches, each:
{
  "id": int, "home": [pid, pid], "away": [pid, pid],
  "winner_side": "home" | "away" | "draw",
  "sets": [{"calling_player_id", "calling_side", "doubled", "redoubled",
            "success", "winner_side"}]   # completed sets only
}
Cancelled matches are never passed in. Draws are counted separately and are
left out of the win-rate denominator.
"""


def win_rate(wins: int, losses: int):
    decided = wins + losses
    return None if decided == 0 else round(wins / decided * 100, 2)


def _outcome(winner_side, side):
    if winner_side not in ("home", "away"):
        return "draw"
    return "win" if winner_side == side else "loss"


def pair_key(ids):
    return tuple(sorted(ids))


def label(key, names):
    return " + ".join(sorted((names[i] for i in key), key=str.lower))


def _blank(**extra):
    base = {
        "matches": 0, "wins": 0, "losses": 0, "draws": 0,
        "sets_played": 0, "sets_won": 0, "sets_lost": 0,
        "calls_successful": 0, "calls_failed": 0,
        "doubled_calls": 0, "doubled_successful": 0,     # Double only
        "redoubled_calls": 0, "redoubled_successful": 0,
        "single_hand_calls": 0, "single_hand_successful": 0,
    }
    base.update(extra)
    return base


def _add_match(rec, result):
    rec["matches"] += 1
    rec[{"win": "wins", "loss": "losses", "draw": "draws"}[result]] += 1


def _add_set(rec, s, side):
    rec["sets_played"] += 1
    rec["sets_won" if s["winner_side"] == side else "sets_lost"] += 1


def _add_call(rec, s):
    rec["calls_successful" if s["success"] else "calls_failed"] += 1
    if s.get("single_hand"):
        rec["single_hand_calls"] += 1
        rec["single_hand_successful"] += 1 if s["success"] else 0
    elif s["redoubled"]:
        rec["redoubled_calls"] += 1
        rec["redoubled_successful"] += 1 if s["success"] else 0
    elif s["doubled"]:
        rec["doubled_calls"] += 1
        rec["doubled_successful"] += 1 if s["success"] else 0


def _finish(rows):
    out = []
    for r in rows:
        r["win_rate"] = win_rate(r["wins"], r["losses"])
        r["calls_made"] = r["calls_successful"] + r["calls_failed"]
        out.append(r)
    out.sort(
        key=lambda r: (
            r["win_rate"] is None,
            -(r["win_rate"] or 0),
            -r["wins"],
            r["name"].lower(),
        )
    )
    return out


def player_stats(matches, names):
    rows = {}
    for m in matches:
        for side in ("home", "away"):
            result = _outcome(m["winner_side"], side)
            for pid in m[side]:
                r = rows.setdefault(pid, _blank(player_id=pid, name=names[pid]))
                _add_match(r, result)
                for s in m["sets"]:
                    _add_set(r, s, side)
                    if s["calling_player_id"] == pid:
                        _add_call(r, s)
    return _finish(rows.values())


def team_stats(matches, names):
    rows = {}
    for m in matches:
        for side in ("home", "away"):
            key = pair_key(m[side])
            r = rows.setdefault(
                key, _blank(name=label(key, names), player_ids=list(key))
            )
            _add_match(r, _outcome(m["winner_side"], side))
            for s in m["sets"]:
                _add_set(r, s, side)
                if s["calling_side"] == side:  # either member of the team
                    _add_call(r, s)
    return _finish(rows.values())


def head_to_head(matches, names):
    """One row per unordered pair of teams. Home/Away is ignored."""
    rows = {}
    for m in matches:
        home_key, away_key = pair_key(m["home"]), pair_key(m["away"])
        a_key, b_key = sorted([home_key, away_key])
        a_side = "home" if home_key == a_key else "away"

        r = rows.setdefault(
            (a_key, b_key),
            {
                "team_a": label(a_key, names), "team_b": label(b_key, names),
                "team_a_ids": list(a_key), "team_b_ids": list(b_key),
                "matches": 0, "team_a_wins": 0, "team_b_wins": 0, "draws": 0,
            },
        )
        r["matches"] += 1
        result = _outcome(m["winner_side"], a_side)
        if result == "win":
            r["team_a_wins"] += 1
        elif result == "loss":
            r["team_b_wins"] += 1
        else:
            r["draws"] += 1

    out = list(rows.values())
    for r in out:
        r["team_a_win_rate"] = win_rate(r["team_a_wins"], r["team_b_wins"])
        r["team_b_win_rate"] = win_rate(r["team_b_wins"], r["team_a_wins"])
    out.sort(key=lambda r: (-r["matches"], r["team_a"].lower()))
    return out


def best(rows):
    ranked = [r for r in rows if r["win_rate"] is not None]
    if not ranked:
        return None
    top = max(ranked, key=lambda r: (r["win_rate"], r["wins"]))
    return {
        "name": top["name"], "win_rate": top["win_rate"],
        "wins": top["wins"], "matches": top["matches"],
    }

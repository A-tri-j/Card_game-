POSITION_KEYS = {1: "first", 2: "second", 3: "third", 4: "fourth"}


def build_stats(rows):
    """
    rows: list of dicts with match_id, player_id, name, position, score
    Returns {player_id: stats}.
    """
    rows = list(rows)

    worst = {}
    for r in rows:
        worst[r["match_id"]] = max(worst.get(r["match_id"], 0), r["position"])

    stats = {}
    for r in rows:
        s = stats.setdefault(
            r["player_id"],
            {
                "player_id": r["player_id"],
                "name": r["name"],
                "matches": 0,
                "first": 0,
                "second": 0,
                "third": 0,
                "fourth": 0,
                "loser": 0,
                "total_score": 0.0,
            },
        )
        s["matches"] += 1
        s[POSITION_KEYS[r["position"]]] += 1

        # Loser = worst position of that match (nobody loses if everyone tied for 1st).
        if r["position"] == worst[r["match_id"]] and worst[r["match_id"]] > 1:
            s["loser"] += 1

        s["total_score"] += float(r["score"] or 0)

    for s in stats.values():
        s["win_rate"] = round(s["first"] / s["matches"] * 100, 1)
        s["avg_score"] = round(s["total_score"] / s["matches"], 3)
        s["total_score"] = round(s["total_score"], 3)

    return stats


def rank_players(stats):
    """Sort by 1st count, 2nd count, 3rd count, total score. Equal keys share a rank."""
    ordered = sorted(
        stats.values(),
        key=lambda s: (
            -s["first"],
            -s["second"],
            -s["third"],
            -s["total_score"],
            s["name"].lower(),
        ),
    )

    previous = None
    rank = 0
    for index, s in enumerate(ordered, start=1):
        key = (s["first"], s["second"], s["third"], s["total_score"])
        if key != previous:
            rank = index
            previous = key
        s["rank"] = rank

    return ordered

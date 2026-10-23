from app.services.stats import build_stats, rank_players


def row(match_id, player_id, name, position, score):
    return {"match_id": match_id, "player_id": player_id, "name": name,
            "position": position, "score": score}


MATCH_1 = [row(1, 1, "A", 1, 10), row(1, 2, "B", 2, 5), row(1, 3, "C", 3, 1), row(1, 4, "D", 4, -3)]
MATCH_2 = [row(2, 1, "A", 2, 4), row(2, 2, "B", 1, 8), row(2, 3, "C", 4, -2), row(2, 4, "D", 3, 0)]


def test_position_counts():
    stats = build_stats(MATCH_1 + MATCH_2)
    assert stats[1]["first"] == 1 and stats[1]["second"] == 1
    assert stats[2]["first"] == 1 and stats[2]["second"] == 1
    assert stats[3]["third"] == 1 and stats[3]["fourth"] == 1
    assert stats[4]["matches"] == 2


def test_loser_is_worst_position():
    stats = build_stats(MATCH_1 + MATCH_2)
    assert stats[4]["loser"] == 1  # last in match 1
    assert stats[3]["loser"] == 1  # last in match 2
    assert stats[1]["loser"] == 0


def test_tied_for_last_both_lose():
    rows = [row(1, 1, "A", 1, 9), row(1, 2, "B", 2, 5), row(1, 3, "C", 3, 1), row(1, 4, "D", 3, 1)]
    stats = build_stats(rows)
    assert stats[3]["loser"] == 1 and stats[4]["loser"] == 1


def test_everyone_tied_nobody_loses():
    rows = [row(1, i, str(i), 1, 5) for i in range(1, 5)]
    stats = build_stats(rows)
    assert all(s["loser"] == 0 for s in stats.values())
    assert all(s["first"] == 1 for s in stats.values())


def test_win_rate_and_totals():
    stats = build_stats(MATCH_1 + MATCH_2)
    assert stats[1]["win_rate"] == 50.0
    assert stats[1]["total_score"] == 14.0
    assert stats[1]["avg_score"] == 7.0


def test_rank_uses_firsts_then_seconds_then_score():
    stats = build_stats(MATCH_1 + MATCH_2)
    ranked = rank_players(stats)
    # A and B both have 1 first, 1 second; B total 13 vs A total 14 -> A first
    assert [s["name"] for s in ranked][:2] == ["A", "B"]
    assert ranked[0]["rank"] == 1 and ranked[1]["rank"] == 2


def test_equal_players_share_rank():
    rows = [row(1, 1, "A", 1, 5), row(1, 2, "B", 1, 5), row(1, 3, "C", 3, 0), row(1, 4, "D", 4, -1)]
    ranked = rank_players(build_stats(rows))
    assert ranked[0]["rank"] == 1 and ranked[1]["rank"] == 1
    assert ranked[2]["rank"] == 3

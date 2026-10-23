from app.services.t29_stats import head_to_head, player_stats, team_stats, win_rate

NAMES = {1: "Atrij", 2: "Kiron", 3: "Ankit", 4: "Tiyas"}


def s(caller, side, success, doubled=False, redoubled=False):
    winner = side if success else ("away" if side == "home" else "home")
    return {"calling_player_id": caller, "calling_side": side, "doubled": doubled,
            "redoubled": redoubled, "success": success, "winner_side": winner}


def match(home, away, winner, sets=()):
    return {"id": 1, "home": home, "away": away, "winner_side": winner, "sets": list(sets)}


def test_win_rate_formula_and_na():
    assert win_rate(7, 3) == 70.0
    assert win_rate(5, 3) == 62.5
    assert win_rate(0, 0) is None


def test_player_wins_count_once_per_match():
    m = match([1, 2], [3, 4], "home", [s(1, "home", True)] * 3)
    rows = {r["name"]: r for r in player_stats([m], NAMES)}
    assert rows["Atrij"]["wins"] == 1 and rows["Atrij"]["matches"] == 1
    assert rows["Ankit"]["losses"] == 1
    assert rows["Atrij"]["sets_played"] == 3 and rows["Atrij"]["sets_won"] == 3


def test_draws_excluded_from_win_rate():
    ms = [match([1, 2], [3, 4], "home"), match([1, 2], [3, 4], "draw")]
    rows = {r["name"]: r for r in player_stats(ms, NAMES)}
    assert rows["Atrij"]["draws"] == 1
    assert rows["Atrij"]["win_rate"] == 100.0


def test_only_draws_gives_na():
    rows = {r["name"]: r for r in player_stats([match([1, 2], [3, 4], "draw")], NAMES)}
    assert rows["Atrij"]["win_rate"] is None


def test_calls_credited_to_caller_only():
    m = match([1, 2], [3, 4], "home", [s(1, "home", True), s(3, "away", False, doubled=True)])
    rows = {r["name"]: r for r in player_stats([m], NAMES)}
    assert rows["Atrij"]["calls_successful"] == 1
    assert rows["Kiron"]["calls_made"] == 0
    assert rows["Ankit"]["calls_failed"] == 1 and rows["Ankit"]["doubled_calls"] == 1
    # failed call: the opposing team won that set
    assert rows["Atrij"]["sets_won"] == 2


def test_team_order_does_not_matter():
    ms = [match([1, 2], [3, 4], "home"), match([2, 1], [4, 3], "away")]
    teams = {r["name"]: r for r in team_stats(ms, NAMES)}
    assert teams["Atrij + Kiron"]["matches"] == 2
    assert teams["Atrij + Kiron"]["wins"] == 1 and teams["Atrij + Kiron"]["losses"] == 1
    assert len(teams) == 2


def test_same_player_in_different_teams():
    ms = [match([1, 2], [3, 4], "home"), match([1, 3], [2, 4], "home")]
    names = {r["name"] for r in team_stats(ms, NAMES)}
    assert {"Atrij + Kiron", "Ankit + Atrij"} <= names


def test_team_calls_include_both_members():
    m = match([1, 2], [3, 4], "home", [s(1, "home", True), s(2, "home", False)])
    teams = {r["name"]: r for r in team_stats([m], NAMES)}
    assert teams["Atrij + Kiron"]["calls_successful"] == 1
    assert teams["Atrij + Kiron"]["calls_failed"] == 1


def test_head_to_head_ignores_home_away():
    ms = [match([1, 2], [3, 4], "home"), match([3, 4], [1, 2], "home"), match([1, 2], [3, 4], "draw")]
    rows = head_to_head(ms, NAMES)
    assert len(rows) == 1
    r = rows[0]
    assert r["matches"] == 3 and r["draws"] == 1
    assert r["team_a_wins"] == 1 and r["team_b_wins"] == 1
    assert r["team_a_win_rate"] == 50.0


def test_single_hand_counts():
    m = match([1, 2], [3, 4], "home", [
        {**s(1, "home", True), "single_hand": True},
        {**s(1, "home", False), "single_hand": True},
    ])
    rows = {r["name"]: r for r in player_stats([m], NAMES)}
    assert rows["Atrij"]["single_hand_calls"] == 2
    assert rows["Atrij"]["single_hand_successful"] == 1
    assert rows["Atrij"]["doubled_calls"] == 0

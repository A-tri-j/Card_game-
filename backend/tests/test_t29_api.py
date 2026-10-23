NAMES = [("Atrij", "home"), ("Kiron", "home"), ("Ankit", "away"), ("Tiyas", "away")]
BASE = "/api/t29/matches"


def setup_players(client, m, h, names=NAMES):
    return client.patch(
        f"{BASE}/{m['id']}/players",
        json={"players": [{"name": n, "side": s} for n, s in names]},
        headers=h,
    )


def make(client, start=True):
    r = client.post(BASE, json={"created_by": "Atrij", "room_name": "Friday room"})
    assert r.status_code == 201
    m = r.json()
    h = {"X-Edit-Token": m["edit_token"]}
    assert setup_players(client, m, h).status_code == 200
    if start:
        assert client.post(f"{BASE}/{m['id']}/start", headers=h).status_code == 200
    return m, h


def state(client, m):
    return client.get(f"{BASE}/{m['id']}").json()


def pid(client, m, name):
    roster = state(client, m)["roster"]
    return next(p["player_id"] for p in roster if p["name"] == name)


def play(client, m, h, caller, call, points, doubled=False, redoubled=False, single_hand=False):
    mid = m["id"]
    r = client.post(
        f"{BASE}/{mid}/sets/call",
        json={"calling_player_id": pid(client, m, caller), "call_value": call},
        headers=h,
    )
    assert r.status_code == 201, r.text
    n = r.json()["current_set"]["set_number"]
    return client.post(
        f"{BASE}/{mid}/sets/{n}/result",
        json={"points_won": points, "doubled": doubled,
              "redoubled": redoubled, "single_hand": single_hand},
        headers=h,
    )


def test_token_returned_once_and_not_public(client):
    m, _ = make(client, start=False)
    assert m["edit_token"]
    public = state(client, m)
    assert "edit_token" not in public and "edit_token_hash" not in public


def test_exactly_four_players(client):
    m, h = make(client, start=False)
    three = [{"name": n, "side": s} for n, s in NAMES[:3]]
    assert client.patch(f"{BASE}/{m['id']}/players", json={"players": three}, headers=h).status_code == 422
    dupes = [("Atrij", "home"), ("atrij", "home"), ("Ankit", "away"), ("Tiyas", "away")]
    assert setup_players(client, m, h, dupes).status_code == 400


def test_cannot_start_with_unbalanced_teams(client):
    m, h = make(client, start=False)
    uneven = [("Atrij", "home"), ("Kiron", "home"), ("Ankit", "home"), ("Tiyas", "away")]
    assert setup_players(client, m, h, uneven).status_code == 200
    assert client.post(f"{BASE}/{m['id']}/start", headers=h).status_code == 400
    assert state(client, m)["status"] == "setup"


def test_teams_locked_after_start(client):
    m, h = make(client)
    assert setup_players(client, m, h).status_code == 409


def test_changes_need_the_token(client):
    m, h = make(client)
    body = {"calling_player_id": pid(client, m, "Atrij"), "call_value": 18}
    assert client.post(f"{BASE}/{m['id']}/sets/call", json=body).status_code == 403
    assert client.post(f"{BASE}/{m['id']}/sets/call", json=body, headers={"X-Edit-Token": "x"}).status_code == 403
    assert client.post(f"{BASE}/{m['id']}/end").status_code == 403
    assert client.post(f"{BASE}/{m['id']}/cancel", json={"confirm": True}).status_code == 403
    assert client.get(f"{BASE}/{m['id']}").status_code == 200  # public read


def test_normal_success_and_failure(client):
    m, h = make(client)
    assert play(client, m, h, "Atrij", 18, 20).json()["home"]["score"] == 1
    r = play(client, m, h, "Atrij", 18, 10).json()      # fail, opponent 19 >= 18
    assert r["home"]["score"] == 0 and r["away"]["score"] == 1
    assert [s["winner_side"] for s in r["sets"]] == ["home", "away"]


def test_opponent_point_example_call_17(client):
    m, h = make(client)
    r = play(client, m, h, "Atrij", 17, 10).json()
    assert r["home"]["score"] == -1 and r["away"]["score"] == 1
    s = r["sets"][0]
    assert s["opponent_points"] == 19 and s["opponent_points_awarded"] == 1
    assert s["points_awarded"] == -1 and s["success"] is False


def test_opponent_below_call_gets_nothing(client):
    m, h = make(client)
    r = play(client, m, h, "Atrij", 17, 15).json()      # opponent 14 < 17
    assert r["home"]["score"] == -1 and r["away"]["score"] == 0
    assert r["sets"][0]["opponent_points_awarded"] == 0


def test_double_and_redouble_points(client):
    m, h = make(client)
    # Double success: caller +2, opponent 0
    r = play(client, m, h, "Atrij", 18, 20, doubled=True).json()
    assert r["home"]["score"] == 2 and r["away"]["score"] == 0
    # Double fail, opponent 14 < 18: caller -2, opponent 0
    r = play(client, m, h, "Atrij", 18, 15, doubled=True).json()
    assert r["home"]["score"] == 0 and r["away"]["score"] == 0
    # Double fail, opponent 19 >= 18: caller -2, opponent flat +1
    r = play(client, m, h, "Atrij", 18, 10, doubled=True).json()
    assert r["home"]["score"] == -2 and r["away"]["score"] == 1
    # Redouble success by Away: +4
    r = play(client, m, h, "Ankit", 18, 20, doubled=True, redoubled=True).json()
    assert r["away"]["score"] == 5 and r["home"]["score"] == -2


def test_redouble_fail_opponent_gets_only_one(client):
    m, h = make(client)
    r = play(client, m, h, "Atrij", 18, 10, doubled=True, redoubled=True).json()
    assert r["home"]["score"] == -4 and r["away"]["score"] == 1
    s = r["sets"][0]
    assert s["points_awarded"] == -4 and s["opponent_points_awarded"] == 1


def test_redouble_without_double_rejected_and_nothing_scored(client):
    m, h = make(client)
    assert play(client, m, h, "Atrij", 18, 20, redoubled=True).status_code == 400
    s = state(client, m)
    assert s["home"]["score"] == 0 and s["current_set"] is not None


def test_call_range_enforced(client):
    m, h = make(client)
    for bad in (14, 29):
        r = client.post(
            f"{BASE}/{m['id']}/sets/call",
            json={"calling_player_id": pid(client, m, "Atrij"), "call_value": bad},
            headers=h,
        )
        assert r.status_code == 400


def test_second_call_blocked_until_result(client):
    m, h = make(client)
    body = {"calling_player_id": pid(client, m, "Atrij"), "call_value": 18}
    assert client.post(f"{BASE}/{m['id']}/sets/call", json=body, headers=h).status_code == 201
    assert client.post(f"{BASE}/{m['id']}/sets/call", json=body, headers=h).status_code == 409


def test_duplicate_result_submission_scores_once(client):
    m, h = make(client)
    body = {"calling_player_id": pid(client, m, "Atrij"), "call_value": 18}
    client.post(f"{BASE}/{m['id']}/sets/call", json=body, headers=h)
    url = f"{BASE}/{m['id']}/sets/1/result"
    assert client.post(url, json={"points_won": 20}, headers=h).status_code == 200
    assert client.post(url, json={"points_won": 20}, headers=h).status_code == 409
    assert state(client, m)["home"]["score"] == 1


def test_auto_complete_at_plus_six_and_locked_after(client):
    m, h = make(client)
    last = None
    for _ in range(6):
        last = play(client, m, h, "Atrij", 18, 20).json()
    assert last["status"] == "completed"
    assert last["end_reason"] == "auto" and last["winner_side"] == "home"
    assert last["completed_at"]
    body = {"calling_player_id": pid(client, m, "Atrij"), "call_value": 18}
    assert client.post(f"{BASE}/{m['id']}/sets/call", json=body, headers=h).status_code == 409


def test_auto_complete_with_multipliers(client):
    m, h = make(client)
    play(client, m, h, "Atrij", 18, 20, doubled=True, redoubled=True)  # +4
    r = play(client, m, h, "Kiron", 18, 20, doubled=True).json()        # +2 -> 6
    assert r["status"] == "completed" and r["winner_side"] == "home"


def test_minus_six_does_not_end_match(client):
    m, h = make(client)
    for _ in range(6):
        r = play(client, m, h, "Ankit", 18, 15).json()   # opponent 14 < 18, gets 0
    assert r["away"]["score"] == -6 and r["home"]["score"] == 0
    assert r["status"] == "in_progress"


def test_opponent_never_goes_negative(client):
    m, h = make(client)
    for _ in range(3):
        r = play(client, m, h, "Atrij", 18, 15, doubled=True).json()   # opponent 14 < 18
    assert r["away"]["score"] == 0
    assert r["home"]["score"] == -6
    assert r["status"] == "in_progress"


def test_opponent_can_win_by_failed_calls(client):
    m, h = make(client)
    for _ in range(6):
        r = play(client, m, h, "Ankit", 18, 10, doubled=True).json()   # home +1 each time
    assert r["home"]["score"] == 6 and r["away"]["score"] == -12
    assert r["status"] == "completed" and r["winner_side"] == "home"
    assert r["end_reason"] == "auto"


def test_manual_end_winner_and_draw(client):
    m, h = make(client)
    play(client, m, h, "Atrij", 18, 20)
    r = client.post(f"{BASE}/{m['id']}/end", headers=h).json()
    assert r["status"] == "completed" and r["end_reason"] == "manual"
    assert r["winner_side"] == "home"

    m2, h2 = make(client)
    r2 = client.post(f"{BASE}/{m2['id']}/end", headers=h2).json()
    assert r2["winner_side"] == "draw" and r2["result_label"] == "Draw"


def test_end_voids_open_set(client):
    m, h = make(client)
    client.post(
        f"{BASE}/{m['id']}/sets/call",
        json={"calling_player_id": pid(client, m, "Atrij"), "call_value": 18},
        headers=h,
    )
    r = client.post(f"{BASE}/{m['id']}/end", headers=h).json()
    assert r["total_sets"] == 0 and r["sets"] == []


def test_cancel_needs_confirmation_and_stops_scoring(client):
    m, h = make(client)
    assert client.post(f"{BASE}/{m['id']}/cancel", json={"confirm": False}, headers=h).status_code == 400
    r = client.post(f"{BASE}/{m['id']}/cancel", json={"confirm": True}, headers=h).json()
    assert r["status"] == "cancelled" and r["end_reason"] == "cancelled" and r["cancelled_at"]
    body = {"calling_player_id": pid(client, m, "Atrij"), "call_value": 18}
    assert client.post(f"{BASE}/{m['id']}/sets/call", json=body, headers=h).status_code == 409
    assert client.get(f"{BASE}/{m['id']}/result").status_code == 200


def test_result_endpoint_requires_finished_match(client):
    m, _ = make(client)
    assert client.get(f"{BASE}/{m['id']}/result").status_code == 409


def test_full_statistics(client):
    # Match 1: Atrij + Kiron win automatically (6 successful calls by Atrij)
    m1, h1 = make(client)
    for _ in range(6):
        play(client, m1, h1, "Atrij", 18, 20)

    # Match 2: Ankit succeeds once, creator ends it manually -> Ankit + Tiyas win
    m2, h2 = make(client)
    play(client, m2, h2, "Ankit", 18, 20)
    client.post(f"{BASE}/{m2['id']}/end", headers=h2)

    # Match 3: cancelled -> must not count anywhere competitive
    m3, h3 = make(client)
    play(client, m3, h3, "Atrij", 18, 20)
    client.post(f"{BASE}/{m3['id']}/cancel", json={"confirm": True}, headers=h3)

    players = {p["name"]: p for p in client.get("/api/t29/stats/players").json()}
    assert players["Atrij"]["matches"] == 2
    assert players["Atrij"]["wins"] == 1 and players["Atrij"]["losses"] == 1
    assert players["Atrij"]["win_rate"] == 50.0
    assert players["Atrij"]["calls_successful"] == 6
    assert players["Atrij"]["sets_played"] == 7
    assert players["Atrij"]["sets_won"] == 6 and players["Atrij"]["sets_lost"] == 1
    assert players["Kiron"]["calls_made"] == 0
    assert players["Ankit"]["wins"] == 1 and players["Ankit"]["losses"] == 1

    teams = {t["name"]: t for t in client.get("/api/t29/stats/teams").json()}
    assert teams["Atrij + Kiron"]["matches"] == 2
    assert teams["Atrij + Kiron"]["wins"] == 1
    assert teams["Ankit + Tiyas"]["wins"] == 1
    assert len(teams) == 2

    h2h = client.get("/api/t29/stats/head-to-head").json()
    assert len(h2h) == 1
    assert h2h[0]["matches"] == 2
    assert h2h[0]["team_a_wins"] == 1 and h2h[0]["team_b_wins"] == 1

    dash = client.get("/api/t29/stats/dashboard").json()
    assert dash["total_matches"] == 3
    assert dash["completed_matches"] == 2
    assert dash["cancelled_matches"] == 1
    assert dash["total_sets"] == 8  # 6 + 1 + 1 (cancelled match's set was really played)
    assert dash["total_player_wins"] == 4


def test_history_filters(client):
    m1, h1 = make(client)
    for _ in range(6):
        play(client, m1, h1, "Atrij", 18, 20)
    m2, h2 = make(client)
    client.post(f"{BASE}/{m2['id']}/cancel", json={"confirm": True}, headers=h2)

    assert len(client.get(BASE).json()) == 2
    assert len(client.get(BASE, params={"status": "cancelled"}).json()) == 1
    assert len(client.get(BASE, params={"reason": "auto"}).json()) == 1
    assert len(client.get(BASE, params={"player": "ankit"}).json()) == 2
    assert len(client.get(BASE, params={"team": "Kiron, Atrij"}).json()) == 2
    assert len(client.get(BASE, params={"winner_team": "Atrij,Kiron"}).json()) == 1
    assert len(client.get(BASE, params={"winner_team": "Ankit,Tiyas"}).json()) == 0
    assert len(client.get(BASE, params={"date_from": "2020-01-01", "date_to": "2099-01-01"}).json()) == 2


def test_single_hand_points(client):
    m, h = make(client)
    r = play(client, m, h, "Atrij", 18, 29, single_hand=True).json()
    assert r["home"]["score"] == 3 and r["away"]["score"] == 0
    assert r["sets"][0]["mode"] == "single_hand" and r["sets"][0]["effective_call"] == 29

    r = play(client, m, h, "Atrij", 18, 28, single_hand=True).json()   # caller -3, opponent 0
    assert r["home"]["score"] == 0 and r["away"]["score"] == 0

    r = play(client, m, h, "Atrij", 18, 0, single_hand=True).json()    # opponent took all 29
    assert r["home"]["score"] == -3 and r["away"]["score"] == 1


def test_single_hand_with_double_rejected(client):
    m, h = make(client)
    assert play(client, m, h, "Atrij", 18, 29, doubled=True, single_hand=True).status_code == 400
    s = state(client, m)
    assert s["home"]["score"] == 0 and s["current_set"] is not None


def test_two_successful_single_hands_end_the_match(client):
    m, h = make(client)
    play(client, m, h, "Atrij", 18, 29, single_hand=True)
    r = play(client, m, h, "Kiron", 18, 29, single_hand=True).json()   # 3 + 3 = 6
    assert r["status"] == "completed" and r["winner_side"] == "home"

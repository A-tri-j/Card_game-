NAMES = ["Atrij", "Ankit", "Kiron", "Tiyas"]


def create_match(client, rounds=2):
    response = client.post(
        "/api/matches",
        json={"created_by": "Atrij", "total_rounds": rounds, "players": NAMES},
    )
    assert response.status_code == 201
    return response.json()


def fill_round(client, match, number, rows):
    """rows = [(call, tricks), ...] in seat order"""
    body = {
        "scores": [
            {"player_id": p["player_id"], "call_value": c, "tricks_won": t}
            for p, (c, t) in zip(match["players"], rows)
        ]
    }
    return client.patch(
        f"/api/matches/{match['id']}/rounds/{number}",
        json=body,
        headers={"X-Edit-Token": match["edit_token"]},
    )


def test_create_match_returns_token_once(client):
    match = create_match(client)
    assert match["edit_token"]
    assert match["status"] == "in_progress"
    assert len(match["players"]) == 4

    fetched = client.get(f"/api/matches/{match['id']}").json()
    assert "edit_token" not in fetched
    assert "edit_token_hash" not in fetched


def test_duplicate_names_rejected(client):
    response = client.post(
        "/api/matches",
        json={
            "created_by": "Atrij",
            "total_rounds": 2,
            "players": ["Atrij", "atrij", "Kiron", "Tiyas"],
        },
    )
    assert response.status_code == 400


def test_player_search(client):
    create_match(client)
    response = client.get("/api/players", params={"search": "at"})
    assert response.status_code == 200
    assert "Atrij" in [p["name"] for p in response.json()]


def test_edit_without_token_is_forbidden(client):
    match = create_match(client)
    response = client.patch(
        f"/api/matches/{match['id']}/rounds/1",
        json={
            "scores": [
                {
                    "player_id": match["players"][0]["player_id"],
                    "call_value": 3,
                    "tricks_won": 3,
                }
            ]
        },
    )
    assert response.status_code == 403


def test_edit_with_wrong_token_is_forbidden(client):
    match = create_match(client)
    response = client.patch(
        f"/api/matches/{match['id']}/rounds/1",
        json={
            "scores": [
                {
                    "player_id": match["players"][0]["player_id"],
                    "call_value": 3,
                    "tricks_won": 3,
                }
            ]
        },
        headers={"X-Edit-Token": "wrong"},
    )
    assert response.status_code == 403


def test_tricks_do_not_need_to_sum_to_13(client):
    match = create_match(client, rounds=1)
    response = fill_round(
        client, match, 1, [(4, 4), (3, 3), (4, 4), (5, 5)]
    )  # sum = 16
    assert response.status_code == 200
    scores = [s["score_value"] for s in response.json()["rounds"][0]["scores"]]
    assert scores == [4.0, 3.0, 4.0, 5.0]


def test_call_out_of_range_rejected(client):
    match = create_match(client, rounds=1)
    response = fill_round(client, match, 1, [(14, 4), (3, 3), (4, 4), (5, 5)])
    assert response.status_code == 422


def test_round_number_out_of_range(client):
    match = create_match(client, rounds=2)
    response = fill_round(client, match, 3, [(3, 3)] * 4)
    assert response.status_code == 404


def test_complete_with_ties(client):
    match = create_match(client, rounds=1)
    # scores: 4.0, 3.0, 3.0, -5.0
    fill_round(client, match, 1, [(4, 4), (3, 3), (3, 3), (5, 2)])
    response = client.post(
        f"/api/matches/{match['id']}/complete",
        headers={"X-Edit-Token": match["edit_token"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert [p["final_position"] for p in data["players"]] == [1, 2, 2, 4]
    assert [p["final_score"] for p in data["players"]] == [4.0, 3.0, 3.0, -5.0]


def test_complete_incomplete_match_fails(client):
    match = create_match(client, rounds=2)
    fill_round(client, match, 1, [(3, 3)] * 4)
    # round 2 missing
    response = client.post(
        f"/api/matches/{match['id']}/complete",
        headers={"X-Edit-Token": match["edit_token"]},
    )
    assert response.status_code == 400


def test_completed_match_cannot_be_edited_until_reopened(client):
    match = create_match(client, rounds=1)
    fill_round(client, match, 1, [(3, 3)] * 4)

    headers = {"X-Edit-Token": match["edit_token"]}
    client.post(f"/api/matches/{match['id']}/complete", headers=headers)

    assert fill_round(client, match, 1, [(2, 2)] * 4).status_code == 409

    reopened = client.post(f"/api/matches/{match['id']}/reopen", headers=headers)
    assert reopened.status_code == 200
    assert reopened.json()["status"] == "in_progress"

    assert fill_round(client, match, 1, [(2, 2)] * 4).status_code == 200


def test_close_match(client):
    match = create_match(client)
    headers = {"X-Edit-Token": match["edit_token"]}

    assert client.patch(f"/api/matches/{match['id']}/close").status_code == 403

    response = client.patch(f"/api/matches/{match['id']}/close", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "closed"

    assert fill_round(client, match, 1, [(3, 3)] * 4).status_code == 409

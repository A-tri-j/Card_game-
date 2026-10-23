import pytest
from pydantic import ValidationError

from app.schemas.history import HistoryFile

PLAYERS = ["Atrij", "Ankit", "Kiron", "Tiyas"]
ROUND = [{"call": 3, "tricks": 3}] * 4


def match(**overrides):
    base = {"import_key": "H1", "played_on": "2025-01-01",
            "created_by": "Atrij", "players": PLAYERS, "rounds": [ROUND]}
    base.update(overrides)
    return base


def test_valid_round_match():
    data = HistoryFile.model_validate({"matches": [match()]})
    assert data.matches[0].total_rounds == 1


def test_valid_summary_match():
    m = match(rounds=None, total_rounds=5, final_scores=[10, 5, 3, -2])
    HistoryFile.model_validate({"matches": [m]})


def test_duplicate_player_names_rejected():
    with pytest.raises(ValidationError):
        HistoryFile.model_validate({"matches": [match(players=["A", "a", "B", "C"])]})


def test_round_must_have_four_entries():
    with pytest.raises(ValidationError):
        HistoryFile.model_validate({"matches": [match(rounds=[[{"call": 3, "tricks": 3}] * 3])]})


def test_call_out_of_range_rejected():
    bad = [[{"call": 14, "tricks": 3}] + [{"call": 3, "tricks": 3}] * 3]
    with pytest.raises(ValidationError):
        HistoryFile.model_validate({"matches": [match(rounds=bad)]})


def test_rounds_and_final_scores_together_rejected():
    with pytest.raises(ValidationError):
        HistoryFile.model_validate({"matches": [match(final_scores=[1, 2, 3, 4])]})


def test_summary_needs_total_rounds():
    with pytest.raises(ValidationError):
        HistoryFile.model_validate({"matches": [match(rounds=None, final_scores=[1, 2, 3, 4])]})


def test_duplicate_import_keys_rejected():
    with pytest.raises(ValidationError):
        HistoryFile.model_validate({"matches": [match(), match()]})

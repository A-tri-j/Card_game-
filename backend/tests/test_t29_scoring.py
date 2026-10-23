import pytest

from app.services.t29_scoring import (
    apply_points, decide_winner, evaluate_set, mode_for, reached_target, validate_call,
)


def test_normal_success():
    r = evaluate_set(18, 18, False, False)
    assert r["success"] and r["caller_delta"] == 1 and r["opponent_delta"] == 0
    assert evaluate_set(18, 25, False, False)["opponent_points"] == 4


def test_your_example_call_17_caller_10():
    r = evaluate_set(17, 10, False, False)
    assert not r["success"]
    assert r["opponent_points"] == 19
    assert r["caller_delta"] == -1 and r["opponent_delta"] == 1


def test_opponent_exactly_equals_call_gets_point():
    r = evaluate_set(17, 12, False, False)      # opponent 17
    assert r["opponent_points"] == 17 and r["opponent_delta"] == 1


def test_opponent_below_call_gets_zero():
    r = evaluate_set(17, 15, False, False)      # opponent 14
    assert r["caller_delta"] == -1 and r["opponent_delta"] == 0


def test_double_and_redouble():
    assert evaluate_set(18, 20, True, False)["caller_delta"] == 2
    assert evaluate_set(18, 20, True, False)["opponent_delta"] == 0
    r = evaluate_set(18, 10, True, False)          # opponent 19 >= 18
    assert r["caller_delta"] == -2 and r["opponent_delta"] == 1

    assert evaluate_set(18, 20, True, True)["caller_delta"] == 4
    r = evaluate_set(18, 10, True, True)
    assert r["caller_delta"] == -4 and r["opponent_delta"] == 1


def test_opponent_gain_is_flat_in_every_mode():
    for doubled, redoubled in [(False, False), (True, False), (True, True)]:
        assert evaluate_set(17, 10, doubled, redoubled)["opponent_delta"] == 1


def test_opponent_never_negative():
    for call in (15, 20, 28):
        for points in range(0, 30):
            for doubled, redoubled in [(False, False), (True, False), (True, True)]:
                assert evaluate_set(call, points, doubled, redoubled)["opponent_delta"] >= 0


def test_successful_caller_means_opponent_zero():
    for doubled, redoubled in [(False, False), (True, False), (True, True)]:
        r = evaluate_set(18, 25, doubled, redoubled)
        assert r["success"] and r["opponent_delta"] == 0


def test_redouble_requires_double():
    with pytest.raises(ValueError):
        mode_for(False, True)
    with pytest.raises(ValueError):
        evaluate_set(18, 20, False, True)


def test_points_won_range():
    evaluate_set(18, 29, False, False)
    with pytest.raises(ValueError):
        evaluate_set(18, 30, False, False)
    with pytest.raises(ValueError):
        evaluate_set(18, -1, False, False)


def test_call_range():
    validate_call(15, 15, 28)
    validate_call(28, 15, 28)
    with pytest.raises(ValueError):
        validate_call(14, 15, 28)
    with pytest.raises(ValueError):
        validate_call(29, 15, 28)


def test_apply_points_both_sides():
    assert apply_points(2, 1, "home", 2) == (4, 1)
    assert apply_points(2, 1, "away", -1, 1) == (3, 0)
    assert apply_points(0, 0, "home", -1, 1) == (-1, 1)


def test_target_is_plus_six_only():
    assert reached_target(6, 0, 6) == "home"
    assert reached_target(0, 7, 6) == "away"
    assert reached_target(-6, 0, 6) is None
    assert reached_target(5, -6, 6) is None


def test_decide_winner():
    assert decide_winner(3, 1) == "home"
    assert decide_winner(-2, 0) == "away"
    assert decide_winner(2, 2) == "draw"


def test_single_hand_success():
    r = evaluate_set(18, 29, False, False, single_hand=True)
    assert r["success"] and r["caller_delta"] == 3 and r["opponent_delta"] == 0


def test_single_hand_fail_opponent_zero():
    r = evaluate_set(18, 28, False, False, single_hand=True)   # opponent 1
    assert not r["success"] and r["caller_delta"] == -3 and r["opponent_delta"] == 0
    r = evaluate_set(18, 10, False, False, single_hand=True)   # opponent 19 < 29
    assert r["caller_delta"] == -3 and r["opponent_delta"] == 0


def test_single_hand_opponent_takes_all_29():
    r = evaluate_set(18, 0, False, False, single_hand=True)
    assert r["caller_delta"] == -3 and r["opponent_delta"] == 1 and r["opponent_points"] == 29


def test_single_hand_ignores_the_recorded_call():
    # recorded call 15, but Single Hand always needs 29
    assert evaluate_set(15, 20, False, False, single_hand=True)["success"] is False


def test_single_hand_cannot_mix_with_double():
    with pytest.raises(ValueError):
        evaluate_set(18, 29, True, False, single_hand=True)
    with pytest.raises(ValueError):
        mode_for(True, True, True)

from decimal import Decimal

import pytest

from app.services.scoring import calculate_positions, calculate_round_score


def test_called_exactly():
    assert calculate_round_score(3, 3) == Decimal("3.000")


def test_extra_tricks_give_bonus():
    assert calculate_round_score(4, 6) == Decimal("4.200")


def test_failed_call_loses_call_value():
    assert calculate_round_score(4, 3) == Decimal("-4.000")


def test_zero_tricks_fails():
    assert calculate_round_score(2, 0) == Decimal("-2.000")


def test_float_values():
    assert calculate_round_score(2.5, 3) == Decimal("2.550")


def test_call_out_of_range():
    with pytest.raises(ValueError):
        calculate_round_score(0.5, 3)
    with pytest.raises(ValueError):
        calculate_round_score(14, 3)


def test_tricks_out_of_range():
    with pytest.raises(ValueError):
        calculate_round_score(3, -1)
    with pytest.raises(ValueError):
        calculate_round_score(3, 14)


def test_positions_without_ties():
    totals = {1: Decimal("10"), 2: Decimal("5"), 3: Decimal("-2"), 4: Decimal("7")}
    assert calculate_positions(totals) == {1: 1, 4: 2, 2: 3, 3: 4}


def test_tie_shares_position_and_skips_next():
    totals = {1: Decimal("4"), 2: Decimal("3"), 3: Decimal("3"), 4: Decimal("-5")}
    assert calculate_positions(totals) == {1: 1, 2: 2, 3: 2, 4: 4}


def test_all_tied():
    totals = {1: Decimal("1"), 2: Decimal("1"), 3: Decimal("1"), 4: Decimal("1")}
    assert set(calculate_positions(totals).values()) == {1}

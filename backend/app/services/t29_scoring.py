"""
29 game scoring rules. Pure functions, no database.
CONFIRM MULTIPLIERS against your local rules before going live.
"""

SINGLE_HAND_CALL = 29
MULTIPLIERS = {"normal": 1, "double": 2, "redouble": 4, "single_hand": 3}
TOTAL_POINTS = 29          # points in one hand; opponent = 29 - caller
MAX_CARD_POINTS = TOTAL_POINTS

# Rule: the opponent only ever gains a flat +1 (never multiplied, never negative).
OPPONENT_GAIN = 1


def mode_for(doubled: bool, redoubled: bool, single_hand: bool = False) -> str:
    if single_hand:
        if doubled or redoubled:
            raise ValueError("Single Hand cannot be combined with Double or Redouble")
        return "single_hand"
    if redoubled and not doubled:
        raise ValueError("Redouble can only be used after a Double")
    if redoubled:
        return "redouble"
    if doubled:
        return "double"
    return "normal"


def validate_call(value: int, call_min: int, call_max: int) -> None:
    if not call_min <= value <= call_max:
        raise ValueError(f"Call must be between {call_min} and {call_max}")


def validate_points_won(points: int) -> None:
    if not 0 <= points <= TOTAL_POINTS:
        raise ValueError(f"Points won must be between 0 and {TOTAL_POINTS}")


def evaluate_set(
    call_value: int,
    points_won: int,
    doubled: bool,
    redoubled: bool,
    single_hand: bool = False,
) -> dict:
    """
    Single Hand: the call is 29 and the caller scores +3 / -3.
    Opponent gets a flat +1 only when the opponent reached the call (29 for Single Hand).
    The opponent never goes negative.
    """
    multiplier = MULTIPLIERS[mode_for(doubled, redoubled, single_hand)]
    validate_points_won(points_won)

    effective_call = SINGLE_HAND_CALL if single_hand else call_value
    opponent_points = TOTAL_POINTS - points_won

    if points_won >= effective_call:
        return {
            "success": True,
            "opponent_points": opponent_points,
            "caller_delta": multiplier,
            "opponent_delta": 0,
        }

    return {
        "success": False,
        "opponent_points": opponent_points,
        "caller_delta": -multiplier,
        "opponent_delta": OPPONENT_GAIN if opponent_points >= effective_call else 0,
    }


def other_side(side: str) -> str:
    return "away" if side == "home" else "home"


def apply_points(home: int, away: int, calling_side: str, caller_delta: int, opponent_delta: int = 0):
    if calling_side == "home":
        return home + caller_delta, away + opponent_delta
    return home + opponent_delta, away + caller_delta


def reached_target(home: int, away: int, target: int):
    """A team must reach +target. A score of -target does NOT end the match."""
    if home >= target:
        return "home"
    if away >= target:
        return "away"
    return None


def decide_winner(home: int, away: int) -> str:
    if home > away:
        return "home"
    if away > home:
        return "away"
    return "draw"

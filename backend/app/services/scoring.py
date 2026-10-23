from decimal import Decimal, ROUND_HALF_UP

BONUS_RATE = Decimal("0.1")
THREE_PLACES = Decimal("0.001")


def calculate_round_score(call_value, tricks_won) -> Decimal:
    """
    tricks_won >= call -> call + (tricks_won - call) * 0.1
    tricks_won <  call -> -call

    No rule about the total tricks of all players in a round.
    """
    call = Decimal(str(call_value))
    tricks = Decimal(str(tricks_won))

    if call < 1 or call > 13:
        raise ValueError("call must be between 1 and 13")
    if tricks < 0 or tricks > 13:
        raise ValueError("tricks_won must be between 0 and 13")

    if tricks >= call:
        score = call + (tricks - call) * BONUS_RATE
    else:
        score = -call

    return score.quantize(THREE_PLACES, rounding=ROUND_HALF_UP)


def calculate_positions(totals: dict[int, Decimal]) -> dict[int, int]:
    """
    Competition ranking: highest total is 1st.
    Equal totals share a position and the next position is skipped
    (1, 2, 2, 4).
    """
    ordered = sorted(totals.items(), key=lambda item: item[1], reverse=True)
    positions: dict[int, int] = {}
    previous_total = None
    current_position = 0

    for index, (player_id, total) in enumerate(ordered, start=1):
        if total != previous_total:
            current_position = index
            previous_total = total
        positions[player_id] = current_position

    return positions

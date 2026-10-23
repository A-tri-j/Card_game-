from datetime import datetime, time, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.matches import get_or_create_player
from app.db.models import Match, MatchPlayer, Round, RoundScore
from app.schemas.history import HistoryFile
from app.services.scoring import calculate_positions, calculate_round_score


def import_history(db: Session, payload: dict, dry_run: bool = False) -> dict:
    data = HistoryFile.model_validate(payload)  # raises ValidationError on bad data

    existing_keys = set(
        db.scalars(select(Match.import_key).where(Match.import_key.is_not(None)))
    )
    report = {"imported": [], "skipped": []}

    try:
        for hm in data.matches:
            if hm.import_key in existing_keys:
                report["skipped"].append(hm.import_key)
                continue

            played = datetime.combine(hm.played_on, time(12, 0), tzinfo=timezone.utc)
            match = Match(
                game_type="call_bridge",
                created_by=hm.created_by,
                total_rounds=hm.total_rounds,
                status="completed",
                edit_token_hash=None,  # imported matches cannot be edited
                import_key=hm.import_key,
                created_at=played,
                completed_at=played,
            )
            db.add(match)

            seats = []
            for seat, name in enumerate(hm.players, start=1):
                player = get_or_create_player(db, name)
                mp = MatchPlayer(player=player, seat_number=seat)
                match.players.append(mp)
                seats.append(mp)

            totals = {mp.player.id: Decimal("0") for mp in seats}

            if hm.rounds is not None:
                for number, entries in enumerate(hm.rounds, start=1):
                    rnd = Round(round_number=number)
                    match.rounds.append(rnd)
                    for mp, entry in zip(seats, entries):
                        score = calculate_round_score(entry.call, entry.tricks)
                        rnd.scores.append(
                            RoundScore(
                                player_id=mp.player.id,
                                call_value=entry.call,
                                tricks_won=entry.tricks,
                                score_value=score,
                            )
                        )
                        totals[mp.player.id] += score
            else:
                for mp, value in zip(seats, hm.final_scores):
                    totals[mp.player.id] = Decimal(value)

            positions = calculate_positions(totals)
            for mp in seats:
                mp.final_score = totals[mp.player.id]
                mp.final_position = positions[mp.player.id]

            report["imported"].append(
                {
                    "key": hm.import_key,
                    "date": str(hm.played_on),
                    "results": [
                        (mp.player.name, float(totals[mp.player.id]),
                         positions[mp.player.id])
                        for mp in seats
                    ],
                }
            )

        if dry_run:
            db.rollback()
        else:
            db.commit()
    except Exception:
        db.rollback()
        raise

    return report

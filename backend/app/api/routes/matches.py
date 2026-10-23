from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.security import generate_edit_token, hash_token, token_matches
from app.db.models import Match, MatchPlayer, Player, Round, RoundScore
from app.db.session import get_db
from app.schemas.match import MatchCreate, RoundUpdate, normalize_name
from app.services.scoring import calculate_positions, calculate_round_score

router = APIRouter(prefix="/api/matches", tags=["matches"])


# ---------- helpers ----------


def _num(value):
    return None if value is None else float(value)


def get_or_create_player(db: Session, name: str) -> Player:
    normalized = normalize_name(name)
    existing = db.scalar(select(Player).where(Player.normalized_name == normalized))
    if existing:
        return existing

    try:
        with db.begin_nested():
            player = Player(name=name, normalized_name=normalized)
            db.add(player)
            db.flush()
        return player
    except IntegrityError:
        # Another request created the same player at the same time.
        return db.scalar(select(Player).where(Player.normalized_name == normalized))


def load_match(db: Session, match_id: int, for_update: bool = False) -> Match:
    stmt = (
        select(Match)
        .where(Match.id == match_id)
        .options(
            selectinload(Match.players).selectinload(MatchPlayer.player),
            selectinload(Match.rounds).selectinload(Round.scores),
        )
    )
    if for_update:
        stmt = stmt.with_for_update(of=Match)
    match = db.scalar(stmt)
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


def require_owner(match: Match, token: str | None) -> None:
    if not token_matches(token, match.edit_token_hash):
        raise HTTPException(status_code=403, detail="Invalid or missing edit token")


def compute_totals(match: Match) -> dict[int, Decimal]:
    totals = {mp.player_id: Decimal("0") for mp in match.players}
    for rnd in match.rounds:
        for score in rnd.scores:
            if score.score_value is not None and score.player_id in totals:
                totals[score.player_id] += score.score_value
    return totals


def serialize_match(match: Match) -> dict:
    seats = sorted(match.players, key=lambda mp: mp.seat_number)
    totals = compute_totals(match)
    rounds_by_number = {r.round_number: r for r in match.rounds}

    rounds_out = []
    for number in range(1, match.total_rounds + 1):
        rnd = rounds_by_number.get(number)
        by_player = {s.player_id: s for s in rnd.scores} if rnd else {}
        rounds_out.append(
            {
                "round_number": number,
                "scores": [
                    {
                        "player_id": mp.player_id,
                        "call_value": _num(by_player[mp.player_id].call_value)
                        if mp.player_id in by_player
                        else None,
                        "tricks_won": _num(by_player[mp.player_id].tricks_won)
                        if mp.player_id in by_player
                        else None,
                        "score_value": _num(by_player[mp.player_id].score_value)
                        if mp.player_id in by_player
                        else None,
                    }
                    for mp in seats
                ],
            }
        )

    return {
        "id": match.id,
        "game_type": match.game_type,
        "created_by": match.created_by,
        "total_rounds": match.total_rounds,
        "status": match.status,
        "created_at": match.created_at.isoformat() if match.created_at else None,
        "completed_at": match.completed_at.isoformat() if match.completed_at else None,
        "players": [
            {
                "player_id": mp.player_id,
                "name": mp.player.name,
                "seat_number": mp.seat_number,
                "total": _num(
                    mp.final_score if mp.final_score is not None else totals[mp.player_id]
                ),
                "final_score": _num(mp.final_score),
                "final_position": mp.final_position,
            }
            for mp in seats
        ],
        "rounds": rounds_out,
    }


# ---------- endpoints ----------


@router.post("", status_code=201)
def create_match(payload: MatchCreate, db: Session = Depends(get_db)):
    normalized = [normalize_name(n) for n in payload.players]
    if len(set(normalized)) != 4:
        raise HTTPException(
            status_code=400, detail="All 4 player names must be different"
        )

    edit_token = generate_edit_token()

    match = Match(
        game_type=payload.game_type,
        created_by=payload.created_by,
        total_rounds=payload.total_rounds,
        status="in_progress",
        edit_token_hash=hash_token(edit_token),
    )
    db.add(match)

    for seat, name in enumerate(payload.players, start=1):
        player = get_or_create_player(db, name)
        match.players.append(MatchPlayer(player=player, seat_number=seat))

    db.commit()
    match = load_match(db, match.id)
    data = serialize_match(match)
    # The token is shown ONLY here, once. Save it in the browser.
    data["edit_token"] = edit_token
    return data


@router.get("")
def list_matches(
    game_type: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Match)
        .options(
            selectinload(Match.players).selectinload(MatchPlayer.player),
            selectinload(Match.rounds).selectinload(Round.scores),
        )
        .order_by(Match.created_at.desc())
        .limit(limit)
    )
    if game_type:
        stmt = stmt.where(Match.game_type == game_type)
    if status:
        stmt = stmt.where(Match.status == status)
    return [serialize_match(m) for m in db.scalars(stmt).all()]


@router.get("/{match_id}")
def get_match(match_id: int, db: Session = Depends(get_db)):
    return serialize_match(load_match(db, match_id))


@router.patch("/{match_id}/rounds/{round_number}")
def update_round(
    match_id: int,
    round_number: int,
    payload: RoundUpdate,
    db: Session = Depends(get_db),
    x_edit_token: str | None = Header(default=None),
):
    match = load_match(db, match_id, for_update=True)
    require_owner(match, x_edit_token)

    if match.status != "in_progress":
        raise HTTPException(status_code=409, detail="Match is not open for editing")

    if round_number < 1 or round_number > match.total_rounds:
        raise HTTPException(
            status_code=404, detail="Round does not exist in this match"
        )

    valid_ids = {mp.player_id for mp in match.players}
    sent_ids = [item.player_id for item in payload.scores]

    if len(set(sent_ids)) != len(sent_ids):
        raise HTTPException(status_code=400, detail="Duplicate player in request")
    if not set(sent_ids).issubset(valid_ids):
        raise HTTPException(
            status_code=400, detail="Player does not belong to this match"
        )

    rnd = next((r for r in match.rounds if r.round_number == round_number), None)
    if rnd is None:
        rnd = Round(round_number=round_number)
        match.rounds.append(rnd)

    existing = {s.player_id: s for s in rnd.scores}

    for item in payload.scores:
        score = existing.get(item.player_id)
        if score is None:
            score = RoundScore(player_id=item.player_id)
            rnd.scores.append(score)

        score.call_value = item.call_value
        score.tricks_won = item.tricks_won

        if item.call_value is not None and item.tricks_won is not None:
            score.score_value = calculate_round_score(
                item.call_value, item.tricks_won
            )
        else:
            score.score_value = None

    db.commit()
    return serialize_match(match)


@router.post("/{match_id}/complete")
def complete_match(
    match_id: int,
    db: Session = Depends(get_db),
    x_edit_token: str | None = Header(default=None),
):
    match = load_match(db, match_id, for_update=True)
    require_owner(match, x_edit_token)

    if match.status != "in_progress":
        raise HTTPException(status_code=409, detail="Match is not in progress")

    rounds_by_number = {r.round_number: r for r in match.rounds}
    player_ids = [mp.player_id for mp in match.players]

    missing = []
    for number in range(1, match.total_rounds + 1):
        rnd = rounds_by_number.get(number)
        by_player = {s.player_id: s for s in rnd.scores} if rnd else {}
        for pid in player_ids:
            s = by_player.get(pid)
            if s is None or s.score_value is None:
                missing.append(number)
                break

    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Incomplete rounds: {missing}. Enter call and tricks for all 4 players.",
        )

    totals = compute_totals(match)
    positions = calculate_positions(totals)

    for mp in match.players:
        mp.final_score = totals[mp.player_id]
        mp.final_position = positions[mp.player_id]

    match.status = "completed"
    match.completed_at = datetime.now(timezone.utc)
    db.commit()
    return serialize_match(match)


@router.post("/{match_id}/reopen")
def reopen_match(
    match_id: int,
    db: Session = Depends(get_db),
    x_edit_token: str | None = Header(default=None),
):
    """Lets the creator fix a mistake after finishing. Final results are cleared."""
    match = load_match(db, match_id, for_update=True)
    require_owner(match, x_edit_token)

    if match.status != "completed":
        raise HTTPException(
            status_code=409, detail="Only a completed match can be reopened"
        )

    for mp in match.players:
        mp.final_score = None
        mp.final_position = None

    match.status = "in_progress"
    match.completed_at = None
    db.commit()
    return serialize_match(match)


@router.patch("/{match_id}/close")
def close_match(
    match_id: int,
    db: Session = Depends(get_db),
    x_edit_token: str | None = Header(default=None),
):
    """Archives the match. Closed matches cannot be edited."""
    match = load_match(db, match_id, for_update=True)
    require_owner(match, x_edit_token)

    if match.status == "closed":
        raise HTTPException(status_code=409, detail="Match is already closed")

    match.status = "closed"
    db.commit()
    return serialize_match(match)

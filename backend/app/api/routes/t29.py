from datetime import date, datetime, time, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.routes.matches import get_or_create_player, require_owner
from app.core.security import generate_edit_token, hash_token
from app.db.models import T29Match, T29MatchPlayer, T29Set
from app.db.session import get_db
from app.schemas.match import clean_name, normalize_name
from app.schemas.t29 import T29Call, T29Cancel, T29Create, T29Players, T29Result
from app.services import t29_stats
from app.services.t29_scoring import (
    MULTIPLIERS,
    apply_points,
    decide_winner,
    evaluate_set,
    mode_for,
    other_side,
    reached_target,
    validate_call,
)

router = APIRouter(prefix="/api/t29", tags=["29 game"])

# India has no daylight saving, so a fixed +05:30 offset is exact for Asia/Kolkata.
IST = timezone(timedelta(hours=5, minutes=30))

Status = Literal["setup", "in_progress", "completed", "cancelled"]
Reason = Literal["auto", "manual", "cancelled"]


# ------------------------------------------------------------------ helpers

def now() -> datetime:
    return datetime.now(timezone.utc)


def iso(value):
    return value.isoformat() if value else None


def load_match(db: Session, match_id: int, for_update: bool = False) -> T29Match:
    stmt = (
        select(T29Match)
        .where(T29Match.id == match_id)
        .options(
            selectinload(T29Match.players).selectinload(T29MatchPlayer.player),
            selectinload(T29Match.sets),
        )
    )
    if for_update:
        stmt = stmt.with_for_update(of=T29Match)
    match = db.scalar(stmt)
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


def require_in_progress(match: T29Match) -> None:
    if match.status != "in_progress":
        raise HTTPException(
            status_code=409,
            detail=f"Match is {match.status.replace('_', ' ')}. Scoring is not open.",
        )


def team_block(match: T29Match, side: str) -> dict:
    members = [
        {"player_id": mp.player_id, "name": mp.player.name}
        for mp in sorted(match.players, key=lambda x: x.seat)
        if mp.side == side
    ]
    return {
        "players": members,
        "label": " + ".join(m["name"] for m in members),
        "score": match.home_score if side == "home" else match.away_score,
    }


def serialize_set(match: T29Match, s: T29Set) -> dict:
    caller = next((mp for mp in match.players if mp.player_id == s.calling_player_id), None)
    return {
        "set_number": s.set_number,
        "status": s.status,
        "calling_player_id": s.calling_player_id,
        "calling_player": caller.player.name if caller else None,
        "calling_side": s.calling_side,
        "calling_team": team_block(match, s.calling_side)["label"],
        "call_value": s.call_value,
        "doubled": s.doubled,
        "redoubled": s.redoubled,
        "single_hand": s.single_hand,
        "effective_call": 29 if s.single_hand else s.call_value,
        "mode": mode_for(s.doubled, s.redoubled, s.single_hand),
        "points_won": s.points_won,
        "success": s.success,
        "points_awarded": s.points_awarded,
        "opponent_points": s.opponent_points,
        "opponent_points_awarded": s.opponent_points_awarded,
        "winner_side": s.winner_side,
        "created_at": iso(s.created_at),
        "completed_at": iso(s.completed_at),
    }


def result_label(match: T29Match):
    if match.status == "cancelled":
        return "Cancelled"
    if match.status != "completed":
        return None
    if match.winner_side == "draw":
        return "Draw"
    return team_block(match, match.winner_side)["label"]


def serialize_match(match: T29Match) -> dict:
    sets = sorted(match.sets, key=lambda s: s.set_number)
    open_set = next((s for s in sets if s.status == "called"), None)
    done = [s for s in sets if s.status == "completed"]
    end = match.completed_at or match.cancelled_at
    duration = (
        int((end - match.started_at).total_seconds())
        if end and match.started_at
        else None
    )
    return {
        "id": match.id,
        "room_name": match.room_name,
        "created_by": match.created_by,
        "status": match.status,
        "end_reason": match.end_reason,
        "winner_side": match.winner_side,
        "result_label": result_label(match),
        "rules": {
            "call_min": match.call_min,
            "call_max": match.call_max,
            "target_score": match.target_score,
            "multipliers": MULTIPLIERS,
        },
        "roster": [
            {"player_id": mp.player_id, "name": mp.player.name,
             "side": mp.side, "seat": mp.seat}
            for mp in sorted(match.players, key=lambda x: x.seat)
        ],
        "home": team_block(match, "home"),
        "away": team_block(match, "away"),
        "current_set": serialize_set(match, open_set) if open_set else None,
        "next_set_number": (
            open_set.set_number
            if open_set
            else max((s.set_number for s in sets), default=0) + 1
        ),
        "total_sets": len(done),
        "sets": [serialize_set(match, s) for s in sets if s.status != "voided"],
        "created_at": iso(match.created_at),
        "started_at": iso(match.started_at),
        "completed_at": iso(match.completed_at),
        "cancelled_at": iso(match.cancelled_at),
        "duration_seconds": duration,
    }


def summary(match: T29Match) -> dict:
    return {
        "id": match.id,
        "room_name": match.room_name,
        "created_by": match.created_by,
        "status": match.status,
        "end_reason": match.end_reason,
        "winner_side": match.winner_side,
        "result_label": result_label(match),
        "home": team_block(match, "home"),
        "away": team_block(match, "away"),
        "total_sets": len([s for s in match.sets if s.status == "completed"]),
        "created_at": iso(match.created_at),
        "completed_at": iso(match.completed_at),
        "cancelled_at": iso(match.cancelled_at),
    }


def void_open_sets(match: T29Match) -> None:
    for s in match.sets:
        if s.status == "called":
            s.status = "voided"


# ------------------------------------------------------------- match lifecycle

@router.post("/matches", status_code=201)
def create_match(payload: T29Create, db: Session = Depends(get_db)):
    token = generate_edit_token()
    match = T29Match(
        room_name=payload.room_name,
        created_by=payload.created_by,
        status="setup",
        edit_token_hash=hash_token(token),
        call_min=payload.call_min,
        call_max=payload.call_max,
        target_score=payload.target_score,
    )
    db.add(match)
    db.commit()

    data = serialize_match(load_match(db, match.id))
    data["edit_token"] = token  # shown ONLY once
    return data


@router.patch("/matches/{match_id}/players")
def set_players(
    match_id: int,
    payload: T29Players,
    db: Session = Depends(get_db),
    x_edit_token: str | None = Header(default=None),
):
    match = load_match(db, match_id, for_update=True)
    require_owner(match, x_edit_token)
    if match.status != "setup":
        raise HTTPException(status_code=409, detail="Teams are locked once the game has started")

    names = [clean_name(s.name) for s in payload.players]
    if any(not n for n in names):
        raise HTTPException(status_code=400, detail="Player names cannot be empty")
    if len({normalize_name(n) for n in names}) != 4:
        raise HTTPException(status_code=400, detail="All 4 player names must be different")

    match.players.clear()
    db.flush()
    for seat, (slot, name) in enumerate(zip(payload.players, names), start=1):
        player = get_or_create_player(db, name)
        match.players.append(T29MatchPlayer(player=player, seat=seat, side=slot.side))

    db.commit()
    return serialize_match(match)


@router.post("/matches/{match_id}/start")
def start_match(
    match_id: int,
    db: Session = Depends(get_db),
    x_edit_token: str | None = Header(default=None),
):
    match = load_match(db, match_id, for_update=True)
    require_owner(match, x_edit_token)
    if match.status != "setup":
        raise HTTPException(status_code=409, detail="Match has already started or ended")

    if len(match.players) != 4:
        raise HTTPException(status_code=400, detail="Add exactly 4 players first")
    home = [mp for mp in match.players if mp.side == "home"]
    away = [mp for mp in match.players if mp.side == "away"]
    if len(home) != 2 or len(away) != 2:
        raise HTTPException(
            status_code=400,
            detail=f"Each team needs exactly 2 players (Home: {len(home)}, Away: {len(away)})",
        )

    match.status = "in_progress"
    match.started_at = now()
    db.commit()
    return serialize_match(match)


@router.post("/matches/{match_id}/sets/call", status_code=201)
def record_call(
    match_id: int,
    payload: T29Call,
    db: Session = Depends(get_db),
    x_edit_token: str | None = Header(default=None),
):
    match = load_match(db, match_id, for_update=True)
    require_owner(match, x_edit_token)
    require_in_progress(match)

    open_set = next((s for s in match.sets if s.status == "called"), None)
    if open_set:
        raise HTTPException(
            status_code=409,
            detail=f"Submit the result of set {open_set.set_number} first",
        )

    caller = next((mp for mp in match.players if mp.player_id == payload.calling_player_id), None)
    if caller is None:
        raise HTTPException(status_code=400, detail="Calling player is not in this match")

    try:
        validate_call(payload.call_value, match.call_min, match.call_max)
        mode_for(payload.doubled, payload.redoubled)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    number = max((s.set_number for s in match.sets), default=0) + 1
    match.sets.append(
        T29Set(
            set_number=number,
            calling_player_id=caller.player_id,
            calling_side=caller.side,
            call_value=payload.call_value,
            doubled=payload.doubled,
            redoubled=payload.redoubled,
            status="called",
        )
    )
    db.commit()
    return serialize_match(match)


@router.post("/matches/{match_id}/sets/{set_number}/result")
def submit_result(
    match_id: int,
    set_number: int,
    payload: T29Result,
    db: Session = Depends(get_db),
    x_edit_token: str | None = Header(default=None),
):
    match = load_match(db, match_id, for_update=True)  # row lock = no double scoring
    require_owner(match, x_edit_token)
    require_in_progress(match)

    s = next((x for x in match.sets if x.set_number == set_number), None)
    if s is None:
        raise HTTPException(status_code=404, detail="Set not found")
    if s.status != "called":
        raise HTTPException(status_code=409, detail="This set already has a result")

    doubled = s.doubled if payload.doubled is None else payload.doubled
    redoubled = s.redoubled if payload.redoubled is None else payload.redoubled
    single_hand = s.single_hand if payload.single_hand is None else payload.single_hand

    try:
        outcome = evaluate_set(
            s.call_value, payload.points_won, doubled, redoubled, single_hand
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    stamp = now()
    s.doubled, s.redoubled, s.single_hand = doubled, redoubled, single_hand
    s.points_won = payload.points_won
    s.success = outcome["success"]
    s.points_awarded = outcome["caller_delta"]
    s.opponent_points = outcome["opponent_points"]
    s.opponent_points_awarded = outcome["opponent_delta"]
    s.winner_side = s.calling_side if outcome["success"] else other_side(s.calling_side)
    s.status = "completed"
    s.completed_at = stamp

    match.home_score, match.away_score = apply_points(
        match.home_score,
        match.away_score,
        s.calling_side,
        outcome["caller_delta"],
        outcome["opponent_delta"],
    )

    winner = reached_target(match.home_score, match.away_score, match.target_score)
    if winner:
        match.status = "completed"
        match.end_reason = "auto"
        match.winner_side = winner
        match.completed_at = stamp

    db.commit()
    return serialize_match(match)


@router.post("/matches/{match_id}/end")
def end_match(
    match_id: int,
    db: Session = Depends(get_db),
    x_edit_token: str | None = Header(default=None),
):
    match = load_match(db, match_id, for_update=True)
    require_owner(match, x_edit_token)
    require_in_progress(match)

    void_open_sets(match)
    match.winner_side = decide_winner(match.home_score, match.away_score)
    match.status = "completed"
    match.end_reason = "manual"
    match.completed_at = now()
    db.commit()
    return serialize_match(match)


@router.post("/matches/{match_id}/cancel")
def cancel_match(
    match_id: int,
    payload: T29Cancel,
    db: Session = Depends(get_db),
    x_edit_token: str | None = Header(default=None),
):
    match = load_match(db, match_id, for_update=True)
    require_owner(match, x_edit_token)
    if not payload.confirm:
        raise HTTPException(status_code=400, detail="Cancellation must be confirmed")
    if match.status not in ("setup", "in_progress"):
        raise HTTPException(status_code=409, detail="Only an ongoing match can be cancelled")

    void_open_sets(match)
    match.status = "cancelled"
    match.end_reason = "cancelled"
    match.cancelled_at = now()
    db.commit()
    return serialize_match(match)


# ------------------------------------------------------------------ read APIs

@router.get("/matches")
def match_history(
    player: str = Query("", max_length=80),
    team: str = Query("", max_length=200, description="e.g. 'Atrij,Kiron'"),
    winner_team: str = Query("", max_length=200, description="e.g. 'Atrij,Kiron'"),
    status: Status | None = None,
    reason: Reason | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Date range uses the match creation date in IST."""
    stmt = (
        select(T29Match)
        .options(
            selectinload(T29Match.players).selectinload(T29MatchPlayer.player),
            selectinload(T29Match.sets),
        )
        .order_by(T29Match.created_at.desc())
    )
    if status:
        stmt = stmt.where(T29Match.status == status)
    if reason:
        stmt = stmt.where(T29Match.end_reason == reason)
    if date_from:
        stmt = stmt.where(T29Match.created_at >= datetime.combine(date_from, time.min, tzinfo=IST))
    if date_to:
        stmt = stmt.where(
            T29Match.created_at
            < datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=IST)
        )

    def names_set(csv: str) -> set[str]:
        return {normalize_name(n) for n in csv.split(",") if n.strip()}

    wanted_player = normalize_name(player)
    team_set, win_set = names_set(team), names_set(winner_team)

    out = []
    for m in db.scalars(stmt):
        sides = {
            side: {normalize_name(p["name"]) for p in team_block(m, side)["players"]}
            for side in ("home", "away")
        }
        if wanted_player and not any(wanted_player in n for s in sides.values() for n in s):
            continue
        if team_set and team_set not in sides.values():
            continue
        if win_set and (m.winner_side not in ("home", "away") or sides[m.winner_side] != win_set):
            continue
        out.append(summary(m))
        if len(out) >= limit:
            break
    return out


@router.get("/matches/{match_id}")
def get_match(match_id: int, db: Session = Depends(get_db)):
    return serialize_match(load_match(db, match_id))


@router.get("/matches/{match_id}/sets")
def get_sets(match_id: int, db: Session = Depends(get_db)):
    return serialize_match(load_match(db, match_id))["sets"]


@router.get("/matches/{match_id}/result")
def get_result(match_id: int, db: Session = Depends(get_db)):
    match = load_match(db, match_id)
    if match.status not in ("completed", "cancelled"):
        raise HTTPException(status_code=409, detail="Match has not finished yet")
    return serialize_match(match)


# ----------------------------------------------------------------- statistics

def eligible_matches(db: Session):
    """Completed matches only (includes draws and manual ends, never cancelled)."""
    stmt = (
        select(T29Match)
        .where(T29Match.status == "completed")
        .options(
            selectinload(T29Match.players).selectinload(T29MatchPlayer.player),
            selectinload(T29Match.sets),
        )
    )
    names, out = {}, []
    for m in db.scalars(stmt):
        ordered = sorted(m.players, key=lambda x: x.seat)
        for mp in ordered:
            names[mp.player_id] = mp.player.name
        out.append(
            {
                "id": m.id,
                "home": [mp.player_id for mp in ordered if mp.side == "home"],
                "away": [mp.player_id for mp in ordered if mp.side == "away"],
                "winner_side": m.winner_side,
                "sets": [
                    {
                        "calling_player_id": s.calling_player_id,
                        "calling_side": s.calling_side,
                        "doubled": s.doubled,
                        "redoubled": s.redoubled,
                        "single_hand": s.single_hand,
                        "success": s.success,
                        "winner_side": s.winner_side,
                    }
                    for s in m.sets
                    if s.status == "completed"
                ],
            }
        )
    return out, names


@router.get("/stats/players")
def stats_players(db: Session = Depends(get_db)):
    matches, names = eligible_matches(db)
    return t29_stats.player_stats(matches, names)


@router.get("/stats/teams")
def stats_teams(db: Session = Depends(get_db)):
    matches, names = eligible_matches(db)
    return t29_stats.team_stats(matches, names)


@router.get("/stats/head-to-head")
def stats_head_to_head(db: Session = Depends(get_db)):
    matches, names = eligible_matches(db)
    return t29_stats.head_to_head(matches, names)


@router.get("/stats/dashboard")
def dashboard(db: Session = Depends(get_db)):
    counts = dict(db.execute(select(T29Match.status, func.count()).group_by(T29Match.status)).all())
    total_sets = (
        db.scalar(select(func.count()).select_from(T29Set).where(T29Set.status == "completed")) or 0
    )

    matches, names = eligible_matches(db)
    players = t29_stats.player_stats(matches, names)
    teams = t29_stats.team_stats(matches, names)

    return {
        # Rooms still in "setup" are not counted as matches.
        "total_matches": sum(v for k, v in counts.items() if k != "setup"),
        "in_progress_matches": counts.get("in_progress", 0),
        # Completed = auto + manual finishes, including draws.
        "completed_matches": counts.get("completed", 0),
        "drawn_matches": sum(1 for m in matches if m["winner_side"] == "draw"),
        "cancelled_matches": counts.get("cancelled", 0),
        "total_sets": total_sets,
        "total_player_wins": sum(p["wins"] for p in players),
        "best_player": t29_stats.best(players),
        "best_team": t29_stats.best(teams),
    }

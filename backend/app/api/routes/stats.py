from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Match, MatchPlayer, Player
from app.db.session import get_db
from app.schemas.match import normalize_name
from app.services.stats import build_stats, rank_players

router = APIRouter(prefix="/api", tags=["stats"])

Game = Literal["call_bridge", "twenty_nine"]


def fetch_rows(db: Session, game: str):
    stmt = (
        select(
            MatchPlayer.match_id,
            MatchPlayer.player_id,
            Player.name,
            MatchPlayer.final_position,
            MatchPlayer.final_score,
        )
        .join(Match, Match.id == MatchPlayer.match_id)
        .join(Player, Player.id == MatchPlayer.player_id)
        .where(
            Match.game_type == game,
            Match.status.in_(["completed", "closed"]),
            MatchPlayer.final_position.is_not(None),
        )
    )
    return [
        {
            "match_id": row.match_id,
            "player_id": row.player_id,
            "name": row.name,
            "position": row.final_position,
            "score": row.final_score,
        }
        for row in db.execute(stmt)
    ]


@router.get("/leaderboard")
def leaderboard(game: Game = Query("call_bridge"), db: Session = Depends(get_db)):
    ranked = rank_players(build_stats(fetch_rows(db, game)))
    return {"game": game, "players": ranked}


@router.get("/dashboard")
def dashboard(
    game: Game = Query("call_bridge"),
    player: str = Query("", max_length=80),
    db: Session = Depends(get_db),
):
    rows = fetch_rows(db, game)
    ranked = rank_players(build_stats(rows))

    wanted = normalize_name(player)
    selected = None
    if wanted:
        selected = next(
            (s for s in ranked if normalize_name(s["name"]) == wanted), None
        )

    return {
        "game": game,
        "total_matches": len({r["match_id"] for r in rows}),
        "player_names": list(db.scalars(select(Player.name).order_by(Player.name))),
        "player": selected,  # null if this player has no completed match yet
        "top": ranked[:5],
    }

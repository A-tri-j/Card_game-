from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Player
from app.db.session import get_db
from app.schemas.match import normalize_name

router = APIRouter(prefix="/api/players", tags=["players"])


@router.get("")
def search_players(
    search: str = Query("", max_length=80),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    stmt = select(Player).order_by(Player.name).limit(limit)

    normalized = normalize_name(search)
    if normalized:
        stmt = stmt.where(
            Player.normalized_name.contains(normalized, autoescape=True)
        )

    players = db.scalars(stmt).all()
    return [{"id": p.id, "name": p.name} for p in players]

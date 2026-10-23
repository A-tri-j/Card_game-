from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator


def normalize_name(name: str) -> str:
    return " ".join(name.split()).casefold()


def clean_name(name: str) -> str:
    return " ".join(name.split())


class MatchCreate(BaseModel):
    game_type: Literal["call_bridge"] = "call_bridge"
    created_by: str = Field(min_length=1, max_length=100)
    total_rounds: int = Field(ge=1, le=50)
    players: list[str] = Field(min_length=4, max_length=4)

    @field_validator("created_by")
    @classmethod
    def validate_creator(cls, value: str) -> str:
        value = clean_name(value)
        if not value:
            raise ValueError("created_by cannot be empty")
        return value

    @field_validator("players")
    @classmethod
    def validate_players(cls, values: list[str]) -> list[str]:
        cleaned = [clean_name(v) for v in values]
        for name in cleaned:
            if not name:
                raise ValueError("player names cannot be empty")
            if len(name) > 80:
                raise ValueError("player name is too long (max 80)")
        return cleaned


class RoundScoreIn(BaseModel):
    player_id: int
    call_value: Decimal | None = Field(default=None, ge=1, le=13)
    tricks_won: Decimal | None = Field(default=None, ge=0, le=13)


class RoundUpdate(BaseModel):
    scores: list[RoundScoreIn] = Field(min_length=1, max_length=4)

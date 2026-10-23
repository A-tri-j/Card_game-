from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.schemas.match import clean_name, normalize_name


class HistEntry(BaseModel):
    call: Decimal = Field(ge=1, le=13)
    tricks: Decimal = Field(ge=0, le=13)


class HistMatch(BaseModel):
    import_key: str = Field(min_length=1, max_length=64)
    played_on: date
    created_by: str = Field(min_length=1, max_length=100)
    players: list[str] = Field(min_length=4, max_length=4)

    # Mode 1: round-by-round data
    rounds: list[list[HistEntry]] | None = None
    # Mode 2: only final totals are known
    total_rounds: int | None = Field(default=None, ge=1, le=50)
    final_scores: list[Decimal] | None = Field(default=None, min_length=4, max_length=4)

    @model_validator(mode="after")
    def check_match(self):
        self.players = [clean_name(p) for p in self.players]
        self.created_by = clean_name(self.created_by)

        if any(not p or len(p) > 80 for p in self.players):
            raise ValueError(f"{self.import_key}: invalid player name")
        if len({normalize_name(p) for p in self.players}) != 4:
            raise ValueError(f"{self.import_key}: 4 player names must be different")

        if self.rounds is not None:
            if self.final_scores is not None:
                raise ValueError(f"{self.import_key}: give rounds OR final_scores, not both")
            if not self.rounds or len(self.rounds) > 50:
                raise ValueError(f"{self.import_key}: rounds must have 1 to 50 items")
            for number, entries in enumerate(self.rounds, start=1):
                if len(entries) != 4:
                    raise ValueError(
                        f"{self.import_key}: round {number} must have exactly 4 entries"
                    )
            self.total_rounds = len(self.rounds)
        else:
            if self.final_scores is None or self.total_rounds is None:
                raise ValueError(
                    f"{self.import_key}: need rounds, or both total_rounds and final_scores"
                )
        return self


class HistoryFile(BaseModel):
    matches: list[HistMatch]

    @model_validator(mode="after")
    def unique_keys(self):
        keys = [m.import_key for m in self.matches]
        if len(set(keys)) != len(keys):
            raise ValueError("import_key must be unique in the file")
        return self

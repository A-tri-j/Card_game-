from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.match import clean_name

Side = Literal["home", "away"]


class T29Create(BaseModel):
    created_by: str = Field(min_length=1, max_length=100)
    room_name: str = Field(min_length=1, max_length=60)
    call_min: int = Field(default=15, ge=1, le=28)
    call_max: int = Field(default=28, ge=1, le=28)
    target_score: int = Field(default=6, ge=1, le=20)

    @field_validator("created_by", "room_name")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = clean_name(value)
        if not value:
            raise ValueError("must not be empty")
        return value

    @model_validator(mode="after")
    def check_range(self):
        if self.call_min > self.call_max:
            raise ValueError("call_min cannot be greater than call_max")
        return self


class T29PlayerSlot(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    side: Side


class T29Players(BaseModel):
    players: list[T29PlayerSlot] = Field(min_length=4, max_length=4)


class T29Call(BaseModel):
    calling_player_id: int
    call_value: int
    doubled: bool = False
    redoubled: bool = False


class T29Result(BaseModel):
    points_won: int = Field(ge=0, le=29)
    # Optional: Double/Redouble may be declared after the call was recorded.
    doubled: bool | None = None
    redoubled: bool | None = None
    single_hand: bool | None = None


class T29Cancel(BaseModel):
    confirm: bool = False

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    normalized_name: Mapped[str] = mapped_column(
        String(80), unique=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        CheckConstraint("total_rounds > 0", name="ck_matches_total_rounds_positive"),
        CheckConstraint(
            "game_type IN ('call_bridge', 'twenty_nine')",
            name="ck_matches_game_type",
        ),
        CheckConstraint(
            "status IN ('in_progress', 'completed', 'closed')",
            name="ck_matches_status",
        ),
        Index("ix_matches_game_type_status", "game_type", "status"),
        Index("ix_matches_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    game_type: Mapped[str] = mapped_column(String(20), nullable=False)
    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    total_rounds: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="in_progress"
    )
    # Day 2: only the HASH of the private edit token is stored, never the token.
    edit_token_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Used only by the historical importer, to prevent duplicate imports.
    import_key: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    players: Mapped[list["MatchPlayer"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )
    rounds: Mapped[list["Round"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )


class MatchPlayer(Base):
    __tablename__ = "match_players"
    __table_args__ = (
        UniqueConstraint("match_id", "seat_number", name="uq_match_players_seat"),
        CheckConstraint(
            "seat_number BETWEEN 1 AND 4", name="ck_match_players_seat_range"
        ),
        CheckConstraint(
            "final_position IS NULL OR final_position BETWEEN 1 AND 4",
            name="ck_match_players_position_range",
        ),
        Index("ix_match_players_player_id", "player_id"),
    )

    match_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("matches.id", ondelete="CASCADE"), primary_key=True
    )
    player_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("players.id"), primary_key=True
    )
    seat_number: Mapped[int] = mapped_column(Integer, nullable=False)
    final_score: Mapped[Decimal | None] = mapped_column(Numeric(12, 3), nullable=True)
    final_position: Mapped[int | None] = mapped_column(Integer, nullable=True)

    match: Mapped["Match"] = relationship(back_populates="players")
    player: Mapped["Player"] = relationship()


class Round(Base):
    __tablename__ = "rounds"
    __table_args__ = (
        UniqueConstraint("match_id", "round_number", name="uq_rounds_match_number"),
        CheckConstraint("round_number > 0", name="ck_rounds_number_positive"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    match_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False
    )
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)

    match: Mapped["Match"] = relationship(back_populates="rounds")
    scores: Mapped[list["RoundScore"]] = relationship(
        back_populates="round", cascade="all, delete-orphan"
    )


class RoundScore(Base):
    __tablename__ = "round_scores"
    __table_args__ = (
        CheckConstraint(
            "call_value IS NULL OR (call_value >= 1 AND call_value <= 13)",
            name="ck_round_scores_call_range",
        ),
        CheckConstraint(
            "tricks_won IS NULL OR (tricks_won >= 0 AND tricks_won <= 13)",
            name="ck_round_scores_tricks_range",
        ),
        Index("ix_round_scores_player_id", "player_id"),
    )

    round_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("rounds.id", ondelete="CASCADE"), primary_key=True
    )
    player_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("players.id"), primary_key=True
    )
    call_value: Mapped[Decimal | None] = mapped_column(Numeric(8, 3), nullable=True)
    tricks_won: Mapped[Decimal | None] = mapped_column(Numeric(8, 3), nullable=True)
    # Calculated by the backend scoring engine on Day 2.
    score_value: Mapped[Decimal | None] = mapped_column(Numeric(12, 3), nullable=True)

    round: Mapped["Round"] = relationship(back_populates="scores")
    player: Mapped["Player"] = relationship()


# ---------------------------------------------------------------- 29 game

class T29Match(Base):
    __tablename__ = "t29_matches"
    __table_args__ = (
        CheckConstraint(
            "status IN ('setup','in_progress','completed','cancelled')",
            name="ck_t29_matches_status",
        ),
        CheckConstraint(
            "winner_side IS NULL OR winner_side IN ('home','away','draw')",
            name="ck_t29_matches_winner",
        ),
        CheckConstraint(
            "end_reason IS NULL OR end_reason IN ('auto','manual','cancelled')",
            name="ck_t29_matches_end_reason",
        ),
        CheckConstraint(
            "call_min >= 1 AND call_max <= 28 AND call_min <= call_max",
            name="ck_t29_matches_call_range",
        ),
        CheckConstraint(
            "target_score BETWEEN 1 AND 20", name="ck_t29_matches_target"
        ),
        Index("ix_t29_matches_status", "status"),
        Index("ix_t29_matches_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    room_name: Mapped[str] = mapped_column(String(60), nullable=False)
    created_by: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="setup", server_default="setup"
    )
    edit_token_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)

    home_score: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    away_score: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    target_score: Mapped[int] = mapped_column(
        Integer, nullable=False, default=6, server_default="6"
    )
    call_min: Mapped[int] = mapped_column(
        Integer, nullable=False, default=15, server_default="15"
    )
    call_max: Mapped[int] = mapped_column(
        Integer, nullable=False, default=28, server_default="28"
    )

    winner_side: Mapped[str | None] = mapped_column(String(8), nullable=True)
    end_reason: Mapped[str | None] = mapped_column(String(12), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    players: Mapped[list["T29MatchPlayer"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )
    sets: Mapped[list["T29Set"]] = relationship(
        back_populates="match",
        cascade="all, delete-orphan",
        order_by="T29Set.set_number",
    )


class T29MatchPlayer(Base):
    __tablename__ = "t29_match_players"
    __table_args__ = (
        UniqueConstraint("match_id", "seat", name="uq_t29_match_players_seat"),
        CheckConstraint("seat BETWEEN 1 AND 4", name="ck_t29_match_players_seat"),
        CheckConstraint(
            "side IS NULL OR side IN ('home','away')", name="ck_t29_match_players_side"
        ),
        Index("ix_t29_match_players_player_id", "player_id"),
    )

    match_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("t29_matches.id", ondelete="CASCADE"), primary_key=True
    )
    player_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("players.id"), primary_key=True
    )
    seat: Mapped[int] = mapped_column(Integer, nullable=False)
    side: Mapped[str | None] = mapped_column(String(4), nullable=True)

    match: Mapped["T29Match"] = relationship(back_populates="players")
    player: Mapped["Player"] = relationship()


class T29Set(Base):
    __tablename__ = "t29_sets"
    __table_args__ = (
        UniqueConstraint("match_id", "set_number", name="uq_t29_sets_number"),
        CheckConstraint("set_number > 0", name="ck_t29_sets_number"),
        CheckConstraint("calling_side IN ('home','away')", name="ck_t29_sets_side"),
        CheckConstraint(
            "status IN ('called','completed','voided')", name="ck_t29_sets_status"
        ),
        CheckConstraint(
            "NOT redoubled OR doubled", name="ck_t29_sets_redouble_needs_double"
        ),
        CheckConstraint(
            "NOT single_hand OR (NOT doubled AND NOT redoubled)",
            name="ck_t29_sets_single_hand_exclusive",
        ),
        CheckConstraint(
            "points_won IS NULL OR points_won BETWEEN 0 AND 29",
            name="ck_t29_sets_points_won",
        ),
        CheckConstraint(
            "winner_side IS NULL OR winner_side IN ('home','away')",
            name="ck_t29_sets_winner",
        ),
        Index("ix_t29_sets_calling_player", "calling_player_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    match_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("t29_matches.id", ondelete="CASCADE"), nullable=False
    )
    set_number: Mapped[int] = mapped_column(Integer, nullable=False)

    calling_player_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("players.id"), nullable=False
    )
    calling_side: Mapped[str] = mapped_column(String(4), nullable=False)
    call_value: Mapped[int] = mapped_column(Integer, nullable=False)
    doubled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    redoubled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    single_hand: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )

    status: Mapped[str] = mapped_column(
        String(10), nullable=False, default="called", server_default="called"
    )
    points_won: Mapped[int | None] = mapped_column(Integer, nullable=True)
    success: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    points_awarded: Mapped[int | None] = mapped_column(Integer, nullable=True)
    opponent_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    opponent_points_awarded: Mapped[int | None] = mapped_column(Integer, nullable=True)
    winner_side: Mapped[str | None] = mapped_column(String(4), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    match: Mapped["T29Match"] = relationship(back_populates="sets")
    calling_player: Mapped["Player"] = relationship()
"""29 opponent points

Revision ID: da104a5fe657
Revises: 7dcec805a9b1
Create Date: 2026-10-23 12:18:48.841890

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'da104a5fe657'
down_revision: Union[str, Sequence[str], None] = '7dcec805a9b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("t29_sets", sa.Column("opponent_points", sa.Integer(), nullable=True))
    op.add_column("t29_sets", sa.Column("opponent_points_awarded", sa.Integer(), nullable=True))
    op.drop_constraint("ck_t29_sets_points_won", "t29_sets", type_="check")
    op.create_check_constraint(
        "ck_t29_sets_points_won", "t29_sets",
        "points_won IS NULL OR points_won BETWEEN 0 AND 29",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_t29_sets_points_won", "t29_sets", type_="check")
    op.create_check_constraint(
        "ck_t29_sets_points_won", "t29_sets",
        "points_won IS NULL OR points_won BETWEEN 0 AND 28",
    )
    op.drop_column("t29_sets", "opponent_points_awarded")
    op.drop_column("t29_sets", "opponent_points")

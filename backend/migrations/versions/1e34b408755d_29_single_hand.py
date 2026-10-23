"""29 single hand

Revision ID: 1e34b408755d
Revises: da104a5fe657
Create Date: 2026-10-23 12:35:45.826428

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e34b408755d'
down_revision: Union[str, Sequence[str], None] = 'da104a5fe657'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "t29_sets",
        sa.Column("single_hand", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.create_check_constraint(
        "ck_t29_sets_single_hand_exclusive",
        "t29_sets",
        "NOT single_hand OR (NOT doubled AND NOT redoubled)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_t29_sets_single_hand_exclusive", "t29_sets", type_="check")
    op.drop_column("t29_sets", "single_hand")

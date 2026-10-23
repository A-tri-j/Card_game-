# This module re-exports Base and imports all models so that Alembic's
# autogenerate can discover every table via Base.metadata.
from app.db.session import Base  # noqa: F401
from app.db import models  # noqa: F401 — registers all ORM classes with Base

__all__ = ["Base"]

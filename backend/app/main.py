import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes import matches, players, stats, t29
from app.core.config import settings
from app.db.session import engine

logger = logging.getLogger("card-game-tracker")

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
)

allowed_origins = [
    origin.strip()
    for origin in settings.frontend_origins.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Edit-Token"],
)

app.include_router(players.router)
app.include_router(matches.router)
app.include_router(stats.router)
app.include_router(t29.router)


@app.get("/")
def root():
    return {
        "message": "Card Game Tracker API",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    """Checks only that the API process is running (no database call)."""
    return {
        "status": "ok",
        "service": "card-game-tracker-api",
    }


@app.get("/health/db")
def health_db():
    """Checks that PostgreSQL is reachable. Never leaks credentials or errors."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError:
        logger.exception("Database health check failed")
        raise HTTPException(status_code=503, detail="Database unavailable")

    return {
        "status": "ok",
        "database": "connected",
    }
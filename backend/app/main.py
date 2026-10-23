import asyncio
from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes import matches, players, stats, t29
from app.core.config import settings
from app.db.session import engine

logger = logging.getLogger("card-game-tracker")


async def keep_alive_pinger():
    """
    Self-pings the public Render URL to keep the instance warm
    and prevent Render free tier from going into idle sleep mode.
    """
    url = (
        os.getenv("RENDER_EXTERNAL_URL")
        or os.getenv("SELF_PING_URL")
        or "https://cardly-api-0pgt.onrender.com"
    ).rstrip("/")
    ping_url = f"{url}/ping"

    # Wait 45s after boot before starting the loop
    await asyncio.sleep(45)
    logger.info("Keep-alive self-pinger initialized for %s", ping_url)

    # Ping every 9 minutes (540s), well before Render's 15m idle shutdown
    while True:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(ping_url)
                logger.info("[Keep-Alive Heartbeat] Status: %s", res.status_code)
        except Exception as exc:
            logger.warning("[Keep-Alive Heartbeat] Ping failed: %s", exc)

        await asyncio.sleep(540)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the keep-alive background task
    task = asyncio.create_task(keep_alive_pinger())
    yield
    # Clean shutdown
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

allowed_origins = [
    origin.strip()
    for origin in settings.frontend_origins.split(",")
    if origin.strip()
]

# If "*" is in allowed_origins or if empty, allow all origins
use_all_origins = "*" in allowed_origins or not allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if use_all_origins else allowed_origins,
    allow_origin_regex=None if use_all_origins else r"https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
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
        "ping": "/ping",
    }


@app.get("/ping")
def ping():
    """Ultra-lightweight keep-alive heartbeat ping."""
    return {"status": "ok", "pong": True}


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
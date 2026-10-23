from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Card Game Tracker API"
    database_url: str = "postgresql://postgres:password@localhost:5432/card_game_tracker"
    frontend_origins: str = "http://localhost:5173,http://localhost:3000"


settings = Settings()

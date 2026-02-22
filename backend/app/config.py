import secrets

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    ANTHROPIC_API_KEY: str = ""
    YOUTUBE_API_KEY: str = ""
    DEEPGRAM_API_KEY: str = ""
    JWT_SECRET: str = secrets.token_urlsafe(32)
    CORS_ORIGINS: list[str] = ["*"]

    model_config = {"env_file": ".env"}


settings = Settings()

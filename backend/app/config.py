from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    ANTHROPIC_API_KEY: str = ""
    YOUTUBE_API_KEY: str = ""
    DEEPGRAM_API_KEY: str = ""
    CIAM_TENANT_NAME: str = ""
    CIAM_CLIENT_ID: str = ""
    CORS_ORIGINS: list[str] = ["*"]
    DEV_MODE: bool = False

    model_config = {"env_file": ".env"}


settings = Settings()

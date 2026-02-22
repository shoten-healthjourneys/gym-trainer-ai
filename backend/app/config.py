from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    ANTHROPIC_API_KEY: str
    YOUTUBE_API_KEY: str = ""
    DEEPGRAM_API_KEY: str = ""
    B2C_TENANT_NAME: str
    B2C_CLIENT_ID: str
    B2C_POLICY_NAME: str = "B2C_1_signup_signin"
    CORS_ORIGINS: list[str] = ["*"]

    model_config = {"env_file": ".env"}


settings = Settings()

"""ExpensIQ — Application configuration via environment variables."""

import json
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/expensiq"

    # Storage (MinIO / S3)
    STORAGE_BACKEND: str = "s3"
    S3_ENDPOINT: str = "http://minio:9000"
    S3_BUCKET: str = "expensiq-receipts"
    AWS_ACCESS_KEY_ID: str = "minioadmin"
    AWS_SECRET_ACCESS_KEY: str = "minioadmin"

    # OCR
    OCR_PROVIDER: str = "mock"  # "mock" | "tesseract" | "claude" | "google"
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_VISION_API_KEY: str = ""

    # Banking
    BANKING_PROVIDER: str = "mock"

    # CORS
    CORS_ORIGINS: str = '["http://localhost:8000", "http://localhost:3000"]'

    # Auth (Google OAuth + JWT)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 8
    ALLOWED_DOMAIN: str = "lezama.es"

    # Email (SMTP)
    EMAIL_HOST: str = ""
    EMAIL_PORT: int = 587
    EMAIL_USER: str = ""
    EMAIL_PASSWORD: str = ""
    EMAIL_FROM: str = "ExpensIQ <noreply@lezama.es>"

    # App
    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return json.loads(self.CORS_ORIGINS)

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

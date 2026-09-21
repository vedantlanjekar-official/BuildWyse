"""Application configuration from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]
ENV_FILES = (
    ROOT_DIR / ".env",
    ROOT_DIR / "backend" / ".env",
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(p) for p in ENV_FILES if p.exists()],
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_anon_key: str = Field(default="", alias="SUPABASE_ANON_KEY")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_jwt_secret: str = Field(default="", alias="SUPABASE_JWT_SECRET")

    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    ai_mode: Literal["live", "stub"] = Field(default="stub", alias="AI_MODE")

    frontend_url: str = Field(default="http://localhost:5173", alias="FRONTEND_URL")
    backend_url: str = Field(default="http://localhost:8000", alias="BACKEND_URL")
    extra_cors_origins: str = Field(default="", alias="CORS_ORIGINS")
    platform_commission_rate: float = Field(default=0.10, alias="PLATFORM_COMMISSION_RATE")

    email_api_key: str = Field(default="", alias="EMAIL_API_KEY")
    email_mode: Literal["console", "resend"] = Field(default="console", alias="EMAIL_MODE")
    email_from: str = Field(default="BuildWyse <onboarding@resend.dev>", alias="EMAIL_FROM")
    contact_to_email: str = Field(default="vedantlanjekar456@gmail.com", alias="CONTACT_TO_EMAIL")

    app_name: str = "BuildWyse API"
    debug: bool = Field(default=False, alias="DEBUG")
    force_memory_store: bool = Field(default=False, alias="FORCE_MEMORY_STORE")

    @property
    def supabase_configured(self) -> bool:
        if self.force_memory_store:
            return False
        return bool(self.supabase_url and (self.supabase_service_role_key or self.supabase_anon_key))

    @property
    def using_service_role(self) -> bool:
        return bool(self.supabase_service_role_key)

    @property
    def openai_live(self) -> bool:
        return self.ai_mode == "live" and bool(self.openai_api_key)

    @property
    def email_configured(self) -> bool:
        if self.email_mode == "console":
            return True
        return self.email_mode == "resend" and bool(self.email_api_key)

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [
            self.frontend_url,
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        if self.extra_cors_origins:
            origins.extend(
                origin.strip()
                for origin in self.extra_cors_origins.split(",")
                if origin.strip()
            )
        return list(dict.fromkeys(origins))


@lru_cache
def get_settings() -> Settings:
    return Settings()

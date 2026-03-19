"""JobPreference and AutomationPolicy models."""

from typing import Any

from pydantic import BaseModel

from models.base import PyObjectId, TenantDoc


class JobPreference(TenantDoc):
    user_id: PyObjectId
    titles: list[str] = []
    locations: list[str] = []
    remote_ok: bool = True
    min_salary: int | None = None
    max_salary: int | None = None
    currency: str = "USD"
    experience_level: str = ""
    job_types: list[str] = []
    industries: list[str] = []
    excluded_companies: list[str] = []
    keywords: list[str] = []


class JobPreferenceUpsert(BaseModel):
    titles: list[str] = []
    locations: list[str] = []
    remote_ok: bool = True
    min_salary: int | None = None
    max_salary: int | None = None
    currency: str = "USD"
    experience_level: str = ""
    job_types: list[str] = []
    industries: list[str] = []
    excluded_companies: list[str] = []
    keywords: list[str] = []


class AutomationPolicy(TenantDoc):
    user_id: PyObjectId
    auto_apply: bool = False
    max_daily_applications: int = 50
    require_approval: bool = True
    match_threshold: float = 0.7
    allowed_platforms: list[str] = []
    blocked_domains: list[str] = []
    schedule: dict[str, Any] = {}


class AutomationPolicyUpsert(BaseModel):
    auto_apply: bool = False
    max_daily_applications: int = 50
    require_approval: bool = True
    match_threshold: float = 0.7
    allowed_platforms: list[str] = []
    blocked_domains: list[str] = []
    schedule: dict[str, Any] = {}

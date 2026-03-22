"""JobPreference and AutomationPolicy models."""

from typing import Any

from pydantic import BaseModel, Field, model_validator

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
    titles: list[str] = Field(default=[], max_length=20)
    locations: list[str] = Field(default=[], max_length=20)
    remote_ok: bool = True
    min_salary: int | None = Field(default=None, ge=0)
    max_salary: int | None = Field(default=None, ge=0)
    currency: str = Field(default="USD", max_length=5)
    experience_level: str = Field(default="", max_length=50)
    job_types: list[str] = Field(default=[], max_length=10)
    industries: list[str] = Field(default=[], max_length=20)
    excluded_companies: list[str] = Field(default=[], max_length=100)
    keywords: list[str] = Field(default=[], max_length=50)

    @model_validator(mode="after")
    def check_salary_range(self):
        if self.min_salary is not None and self.max_salary is not None:
            if self.min_salary > self.max_salary:
                raise ValueError("min_salary must be <= max_salary")
        return self


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
    max_daily_applications: int = Field(default=50, ge=1, le=500)
    require_approval: bool = True
    match_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    allowed_platforms: list[str] = Field(default=[], max_length=20)
    blocked_domains: list[str] = Field(default=[], max_length=100)
    schedule: dict[str, Any] = {}

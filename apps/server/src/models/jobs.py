"""JobSource, JobPosting, and JobMatch models."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from models.base import PyObjectId, TenantDoc
from models.enums import MatchStatus


class JobSource(TenantDoc):
    name: str
    platform: str
    base_url: str
    adapter: str
    credentials: dict[str, str] = {}
    is_active: bool = True
    fetch_interval_minutes: int = 60
    last_fetched_at: datetime | None = None


class JobSourceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    platform: str = Field(min_length=1, max_length=50)
    base_url: str = Field(min_length=1, max_length=2000)
    adapter: str = Field(min_length=1, max_length=50)
    credentials: dict[str, str] = {}
    fetch_interval_minutes: int = Field(default=60, ge=5, le=10080)


class JobSourceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    base_url: str | None = Field(default=None, min_length=1, max_length=2000)
    adapter: str | None = Field(default=None, min_length=1, max_length=50)
    credentials: dict[str, str] | None = None
    is_active: bool | None = None
    fetch_interval_minutes: int | None = Field(default=None, ge=5, le=10080)


class JobPosting(TenantDoc):
    source_id: PyObjectId
    external_id: str
    title: str
    company: str
    location: str = ""
    url: str
    description: str = ""
    salary_min: int | None = None
    salary_max: int | None = None
    currency: str | None = None
    job_type: str | None = None
    experience_level: str | None = None
    remote: bool = False
    skills: list[str] = []
    posted_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool = True
    raw_data: dict[str, Any] = {}


class JobMatch(TenantDoc):
    user_id: PyObjectId
    posting_id: PyObjectId
    score: float
    status: MatchStatus = MatchStatus.new
    matched_skills: list[str] = []
    notes: str = ""


class JobMatchUpdate(BaseModel):
    status: MatchStatus | None = None
    notes: str | None = Field(default=None, max_length=5000)

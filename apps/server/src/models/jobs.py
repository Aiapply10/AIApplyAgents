"""JobSource, JobPosting, and JobMatch models."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel

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
    name: str
    platform: str
    base_url: str
    adapter: str
    credentials: dict[str, str] = {}
    fetch_interval_minutes: int = 60


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
    notes: str | None = None

"""UserProfile and UserDocument models."""

from typing import Any

from pydantic import BaseModel, Field

from models.base import PyObjectId, TenantDoc


class UserProfile(TenantDoc):
    user_id: PyObjectId
    full_name: str
    avatar_url: str = ""
    headline: str = ""
    summary: str = ""
    location: str = ""
    phone: str = ""
    linkedin_url: str = ""
    github_url: str = ""
    portfolio_url: str = ""
    skills: list[str] = []
    experience: list[dict[str, Any]] = []
    education: list[dict[str, Any]] = []
    certifications: list[dict[str, Any]] = []


class UserProfileUpsert(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    avatar_url: str = Field(default="", max_length=2000)
    headline: str = Field(default="", max_length=500)
    summary: str = Field(default="", max_length=5000)
    location: str = Field(default="", max_length=200)
    phone: str = Field(default="", max_length=30)
    linkedin_url: str = Field(default="", max_length=500)
    github_url: str = Field(default="", max_length=500)
    portfolio_url: str = Field(default="", max_length=500)
    skills: list[str] = Field(default=[], max_length=100)
    experience: list[dict[str, Any]] = Field(default=[], max_length=50)
    education: list[dict[str, Any]] = Field(default=[], max_length=20)
    certifications: list[dict[str, Any]] = Field(default=[], max_length=50)


class UserDocument(TenantDoc):
    user_id: PyObjectId
    doc_type: str
    filename: str
    storage_key: str
    mime_type: str
    size_bytes: int
    is_default: bool = False


class UserDocumentCreate(BaseModel):
    doc_type: str = Field(min_length=1, max_length=50, pattern=r"^(resume|cover_letter|other)$")
    filename: str = Field(min_length=1, max_length=500)
    storage_key: str = Field(min_length=1, max_length=1000)
    mime_type: str = Field(min_length=1, max_length=200)
    size_bytes: int = Field(ge=0, le=50_000_000)
    is_default: bool = False

"""UserProfile and UserDocument models."""

from typing import Any

from pydantic import BaseModel

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


class UserDocument(TenantDoc):
    user_id: PyObjectId
    doc_type: str  # resume, cover_letter
    filename: str
    storage_key: str
    mime_type: str
    size_bytes: int
    is_default: bool = False


class UserDocumentCreate(BaseModel):
    doc_type: str
    filename: str
    storage_key: str
    mime_type: str
    size_bytes: int
    is_default: bool = False

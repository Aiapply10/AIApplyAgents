"""Tenant model — the root multi-tenancy entity."""

from typing import Any

from pydantic import BaseModel, Field

from models.base import MongoDoc


class Tenant(MongoDoc):
    name: str
    slug: str
    plan: str = "free"
    settings: dict[str, Any] = {}
    is_active: bool = True


class TenantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9][a-z0-9-]*$")
    plan: str = Field(default="free", max_length=50)
    settings: dict[str, Any] = {}


class TenantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    plan: str | None = Field(default=None, max_length=50)
    settings: dict[str, Any] | None = None
    is_active: bool | None = None

"""Tenant model — the root multi-tenancy entity."""

from typing import Any

from pydantic import BaseModel

from models.base import MongoDoc


class Tenant(MongoDoc):
    name: str
    slug: str
    plan: str = "free"
    settings: dict[str, Any] = {}
    is_active: bool = True


class TenantCreate(BaseModel):
    name: str
    slug: str
    plan: str = "free"
    settings: dict[str, Any] = {}


class TenantUpdate(BaseModel):
    name: str | None = None
    plan: str | None = None
    settings: dict[str, Any] | None = None
    is_active: bool | None = None

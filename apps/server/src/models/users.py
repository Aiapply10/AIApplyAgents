"""User model — linked to SuperTokens, optionally tenant-scoped."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from models.base import MongoDoc, PyObjectId

VALID_ROLES = ("admin", "manager", "member")


class User(MongoDoc):
    supertokens_user_id: str
    tenant_id: PyObjectId | None = None
    email: str
    display_name: str = ""
    role: str = "member"
    is_active: bool = True
    last_login_at: datetime | None = None


class UserCreate(BaseModel):
    """Admin-initiated user creation (links to existing SuperTokens user)."""

    supertokens_user_id: str = Field(min_length=1)
    tenant_id: PyObjectId | None = None
    email: EmailStr
    display_name: str = Field(default="", max_length=200)
    role: str = Field(default="member", pattern=r"^(admin|manager|member)$")


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=200)
    tenant_id: PyObjectId | None = None
    role: str | None = Field(default=None, pattern=r"^(admin|manager|member)$")
    is_active: bool | None = None
    last_login_at: datetime | None = None

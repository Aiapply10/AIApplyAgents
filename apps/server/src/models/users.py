"""User model — linked to SuperTokens, optionally tenant-scoped."""

from datetime import datetime

from pydantic import BaseModel, EmailStr

from models.base import MongoDoc, PyObjectId


class User(MongoDoc):
    supertokens_user_id: str
    tenant_id: PyObjectId | None = None  # assigned during onboarding
    email: str
    display_name: str
    role: str = "member"
    is_active: bool = True
    last_login_at: datetime | None = None


class UserCreate(BaseModel):
    """Admin-initiated user creation (links to existing SuperTokens user)."""

    supertokens_user_id: str
    tenant_id: PyObjectId | None = None
    email: EmailStr
    display_name: str
    role: str = "member"


class UserUpdate(BaseModel):
    display_name: str | None = None
    tenant_id: PyObjectId | None = None
    role: str | None = None
    is_active: bool | None = None
    last_login_at: datetime | None = None

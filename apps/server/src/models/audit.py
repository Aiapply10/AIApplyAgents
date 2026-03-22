"""AuditEvent and Notification models."""

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field

from models.base import PyObjectId, TenantDoc
from models.enums import NotificationStatus


class AuditEvent(TenantDoc):
    actor_id: PyObjectId | None = None
    action: str
    resource_type: str
    resource_id: PyObjectId
    detail: dict[str, Any] = {}
    ip_address: str | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AuditEventCreate(BaseModel):
    actor_id: PyObjectId | None = None
    action: str = Field(min_length=1, max_length=100)
    resource_type: str = Field(min_length=1, max_length=100)
    resource_id: PyObjectId
    detail: dict[str, Any] = {}
    ip_address: str | None = Field(default=None, max_length=45)


class Notification(TenantDoc):
    user_id: PyObjectId
    type: str
    title: str
    body: str
    status: NotificationStatus = NotificationStatus.unread
    link: str | None = None
    metadata: dict[str, Any] = {}


class NotificationCreate(BaseModel):
    user_id: PyObjectId
    type: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=500)
    body: str = Field(min_length=1, max_length=5000)
    link: str | None = Field(default=None, max_length=2000)
    metadata: dict[str, Any] = {}

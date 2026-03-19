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
    action: str
    resource_type: str
    resource_id: PyObjectId
    detail: dict[str, Any] = {}
    ip_address: str | None = None


class Notification(TenantDoc):
    user_id: PyObjectId
    type: str  # application_submitted, workflow_completed, error
    title: str
    body: str
    status: NotificationStatus = NotificationStatus.unread
    link: str | None = None
    metadata: dict[str, Any] = {}


class NotificationCreate(BaseModel):
    user_id: PyObjectId
    type: str
    title: str
    body: str
    link: str | None = None
    metadata: dict[str, Any] = {}

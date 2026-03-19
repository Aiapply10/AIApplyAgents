"""Status enums shared across services."""

from enum import StrEnum


class WorkflowStatus(StrEnum):
    pending = "pending"
    running = "running"
    paused = "paused"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class TaskStatus(StrEnum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    skipped = "skipped"


class ApplicationStatus(StrEnum):
    pending = "pending"
    in_progress = "in_progress"
    submitted = "submitted"
    failed = "failed"
    withdrawn = "withdrawn"


class FetchRunStatus(StrEnum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class MatchStatus(StrEnum):
    new = "new"
    approved = "approved"
    rejected = "rejected"
    applied = "applied"
    expired = "expired"


class NotificationStatus(StrEnum):
    unread = "unread"
    read = "read"
    dismissed = "dismissed"
